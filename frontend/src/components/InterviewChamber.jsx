import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { FiVolume2, FiVolumeX, FiCpu, FiPhoneOff, FiMic, FiMicOff } from "react-icons/fi";

const API = axios.create({ baseURL: "/api" });

export default function InterviewChamber({ sessionId, onComplete }) {
  // ── State ────────────────────────────────────────────────────────
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [roleConfig, setRoleConfig] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [aiTextResponse, setAiTextResponse] = useState("");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interimCandidateSpeech, setInterimCandidateSpeech] = useState("");
  
  // Guardrails & Visuals
  const [guardrailLogs, setGuardrailLogs] = useState([]);
  const [infractions, setInfractions] = useState([]);
  const [webcamActive, setWebcamActive] = useState(false);
  const [realtimeAlerts, setRealtimeAlerts] = useState({
    noFace: false,
    multipleFaces: false,
    lookingAway: false,
    loudNoise: false
  });

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const logsEndRef = useRef(null);
  const conversationEndRef = useRef(null);
  const landmarkerRef = useRef(null);

  // Audio Contexts & WebSocket Refs
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const wsRef = useRef(null);
  const playbackContextRef = useRef(null);
  const nextPlaybackTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const micProcessorRef = useRef(null);
  const micStreamRef = useRef(null);

  const aiTextResponseRef = useRef("");
  const isMutedRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const interimCandidateSpeechRef = useRef("");

  // Sync refs
  useEffect(() => { aiTextResponseRef.current = aiTextResponse; }, [aiTextResponse]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { aiSpeakingRef.current = aiSpeaking; }, [aiSpeaking]);
  useEffect(() => { interimCandidateSpeechRef.current = interimCandidateSpeech; }, [interimCandidateSpeech]);

  // ── Push Log Helper ──────────────────────────────────────────────
  const pushLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setGuardrailLogs((prev) => [...prev, { timestamp, message, type }]);
  }, []);

  // ── Fetch Session Data on Mount ──────────────────────────────────
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await API.get(`/sessions/${sessionId}`);
        const session = res.data;
        if (session.userId) {
          setRoleConfig({
            targetRole: session.userId.targetRole,
            experienceLevel: session.userId.experienceLevel,
            skillsKeywords: session.userId.skillsKeywords?.join(", ") || "software engineering"
          });
        }
        pushLog("Interview configuration fetched. System ready for live voice.", "system");
      } catch {
        pushLog("Failed to load interview context from session.", "error");
      }
    }
    fetchSession();
  }, [sessionId, pushLog]);

  // ── Load Face Landmarker Model ────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadModel() {
      try {
        pushLog("Loading MediaPipe Face Landmarker assets...", "system");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 4
        });
        if (active) {
          landmarkerRef.current = landmarker;
          pushLog("MediaPipe Face Landmarker loaded.", "success");
        }
      } catch (err) {
        pushLog(`Failed to load Face Landmarker: ${err.message}`, "error");
      }
    }
    loadModel();
    return () => {
      active = false;
      if (landmarkerRef.current) landmarkerRef.current.close();
    };
  }, [pushLog]);

  // ── Webcam Initialization ─────────────────────────────────────────
  useEffect(() => {
    async function initWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setWebcamActive(true);
        pushLog("Webcam stream active.", "success");
      } catch (err) {
        pushLog(`Camera access denied: ${err.message}`, "error");
      }
    }
    initWebcam();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [pushLog]);

  // ── Webcam Re-binding when Interview Starts ────────────────────────
  useEffect(() => {
    if (interviewStarted && mediaStreamRef.current && videoRef.current) {
      console.log("Binding webcam stream to video element.");
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [interviewStarted]);

  // ── Tab Switch / Visibility Change Detection ──────────────────────
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        const infraction = {
          infractionType: "TAB_SWITCH",
          timestamp: new Date().toISOString(),
        };
        setInfractions((prev) => [...prev, infraction]);
        pushLog("⚠ TAB_SWITCH — navigated away from the screen.", "danger");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pushLog]);

  // ── Audio Utilities (PCM <=> Base64) ──────────────────────────────
  const arrayBufferToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToFloat32PCM = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    const pcmFloat32 = new Float32Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      if (i + 1 < len) {
        const int16Val = view.getInt16(i, true);
        pcmFloat32[i / 2] = int16Val / 32768; // Normalize to -1.0 to 1.0
      }
    }
    return pcmFloat32;
  };

  // ── Audio Player Queue ────────────────────────────────────────────
  const queueAudioChunk = (pcmFloat32) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      nextPlaybackTimeRef.current = playbackContextRef.current.currentTime;
    }

    const ctx = playbackContextRef.current;
    
    // Resume context if suspended (browser security policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const audioBuffer = ctx.createBuffer(1, pcmFloat32.length, 24000);
    audioBuffer.getChannelData(0).set(pcmFloat32);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    const startTime = Math.max(nextPlaybackTimeRef.current, ctx.currentTime);
    sourceNode.start(startTime);
    nextPlaybackTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.push(sourceNode);
    sourceNode.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== sourceNode);
    };
  };

  // ── Interruption Handler ──────────────────────────────────────────
  const handleInterruption = useCallback(() => {
    if (!aiSpeakingRef.current) return;
    
    console.log("Candidate interrupted AI speech. Cutting off playback.");
    pushLog("Interruption detected — AI stopped speaking to listen.", "system");

    // Stop all active audio chunks playing
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      activeSourcesRef.current = [];
    }

    // Reset scheduled play time
    if (playbackContextRef.current) {
      nextPlaybackTimeRef.current = playbackContextRef.current.currentTime;
    }

    setAiSpeaking(false);
    setAiTextResponse("");

    // Send interruption cancel signal to Gemini Live API
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const interruptMsg = {
        clientContent: {
          turns: [],
          turnComplete: false
        }
      };
      wsRef.current.send(JSON.stringify(interruptMsg));
    }
  }, [pushLog]);

  // ── WebSocket & Audio Capture Setup ───────────────────────────────
  const startLiveSession = (config) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host.includes("localhost") || window.location.host.includes("127.0.0.1") ? "localhost:3001" : window.location.host;
    const wsUrl = `${protocol}//${host}/api/live-interview?targetRole=${encodeURIComponent(config.targetRole)}&experienceLevel=${encodeURIComponent(config.experienceLevel)}&skillsKeywords=${encodeURIComponent(config.skillsKeywords)}`;

    console.log("Connecting Live Voice API client via WebSocket proxy:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      pushLog("Live voice gateway connected. Initializing session...", "success");
      initMicStreaming();
    };

    ws.onmessage = async (event) => {
      try {
        let rawData = event.data;
        if (event.data instanceof Blob) {
          rawData = await event.data.text();
        }
        const msg = JSON.parse(rawData);

        // Process candidate transcription from Gemini Live
        if (msg.serverContent?.inputTranscription) {
          const trans = msg.serverContent.inputTranscription;
          if (trans.text) {
            setInterimCandidateSpeech(trans.text);
          }
          if (trans.finished) {
            setConversation((prev) => [...prev, { sender: "You", text: trans.text.trim() }]);
            setInterimCandidateSpeech("");
          }
        }

        // Process interruption signal from Gemini
        if (msg.serverContent?.interrupted) {
          console.log("Gemini Server detected interruption.");
          if (activeSourcesRef.current) {
            activeSourcesRef.current.forEach(source => {
              try { source.stop(); } catch (e) {}
            });
            activeSourcesRef.current = [];
          }
          if (playbackContextRef.current) {
            nextPlaybackTimeRef.current = playbackContextRef.current.currentTime;
          }
          setAiSpeaking(false);
          setAiTextResponse("");
        }

        // Commit any remaining user utterance if the AI starts generating its turn
        if (msg.serverContent?.modelTurn) {
          const interimText = interimCandidateSpeechRef.current;
          if (interimText.trim()) {
            setConversation((prev) => {
              const lastTurn = prev[prev.length - 1];
              if (lastTurn && lastTurn.sender === "You" && lastTurn.text === interimText.trim()) {
                return prev;
              }
              return [...prev, { sender: "You", text: interimText.trim() }];
            });
            setInterimCandidateSpeech("");
          }
        }

        // Receive AI voice audio chunks
        if (msg.serverContent?.modelTurn?.parts) {
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
              const base64Data = part.inlineData.data;
              const pcmFloat32 = base64ToFloat32PCM(base64Data);
              queueAudioChunk(pcmFloat32);
              setAiSpeaking(true);
            }
            if (part.text) {
              setAiTextResponse((prev) => prev + part.text);
            }
          }
        }

        // Receive turn completions
        if (msg.serverContent?.turnComplete) {
          setAiSpeaking(false);
          const fullText = aiTextResponseRef.current.trim();
          if (fullText) {
            setConversation((prev) => [...prev, { sender: "AI", text: fullText }]);
          }
          setAiTextResponse("");
        }
      } catch (err) {
        console.error("Error parsing Live API response chunk:", err);
      }
    };

    ws.onclose = () => {
      pushLog("Live voice session disconnected.", "warning");
      stopMicStreaming();
    };

    ws.onerror = () => {
      pushLog("Live session connection error.", "error");
    };
  };

  // ── Microphone PCM Capture Node ──────────────────────────────────
  const initMicStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      // Audio analysis node for VAD / Interruption / RMS levels
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioAnalyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      micProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Signed Int16 PCM
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw PCM buffer as Base64 to Gemini Live API Proxy
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Audio = arrayBufferToBase64(pcmBuffer.buffer);
          const msg = {
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
              }
            }
          };
          wsRef.current.send(JSON.stringify(msg));
        }
      };

      pushLog("Microphone streaming active. AI is listening...", "success");
    } catch (err) {
      pushLog(`Microphone access failed: ${err.message}`, "error");
    }
  };

  const stopMicStreaming = () => {
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // ── Real-time Audio/Video Guardrail Frame Loop ────────────────────
  useEffect(() => {
    let animationFrameId;
    let lastGazeLogTime = 0;
    let lastAbsenceLogTime = 0;
    let lastMultiLogTime = 0;

    const checkFrame = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const analyser = audioAnalyserRef.current;

      if (video && video.readyState >= 3) {
        const now = Date.now();
        const timestamp = performance.now();

        // 1. Calculate RMS volume level
        let rms = 0;
        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = (dataArray[i] - 128) / 128;
            sumSquares += val * val;
          }
          rms = Math.sqrt(sumSquares / bufferLength);
        }
        const isLoud = rms > 0.09;

        if (isLoud && aiSpeakingRef.current && !isMutedRef.current) {
          handleInterruption();
        }

        // 2. Perform Computer Vision tracking checks
        let result = null;
        if (landmarker) {
          try { result = landmarker.detectForVideo(video, timestamp); } catch {}
        }

        let noFace = false, multipleFaces = false, lookingAway = false;

        if (result) {
          const faces = result.faceLandmarks || [];
          if (faces.length === 0) {
            noFace = true;
            if (now - lastAbsenceLogTime > 5000) {
              lastAbsenceLogTime = now;
              setInfractions(p => [...p, { infractionType: "CANDIDATE_ABSENT", timestamp: new Date().toISOString() }]);
              pushLog("⚠ CANDIDATE_ABSENT — no face present in camera field.", "danger");
            }
          } else if (faces.length > 1) {
            multipleFaces = true;
            if (now - lastMultiLogTime > 5000) {
              lastMultiLogTime = now;
              setInfractions(p => [...p, { infractionType: "MULTIPLE_PEOPLE", timestamp: new Date().toISOString() }]);
              pushLog(`⚠ MULTIPLE_PEOPLE — ${faces.length} faces visible.`, "danger");
            }
          } else {
            const landmarks = faces[0];
            const nose = landmarks[4], rightEye = landmarks[33], leftEye = landmarks[263];
            if (nose && rightEye && leftEye) {
              const distLeft = Math.sqrt(Math.pow(nose.x - leftEye.x, 2) + Math.pow(nose.y - leftEye.y, 2));
              const distRight = Math.sqrt(Math.pow(nose.x - rightEye.x, 2) + Math.pow(nose.y - rightEye.y, 2));
              const ratio = distLeft / (distRight || 0.001);
              const avgEyesY = (leftEye.y + rightEye.y) / 2;
              const verticalDelta = nose.y - avgEyesY;
              const turnedSide = ratio < 0.45 || ratio > 2.2;
              const turnedVertical = verticalDelta < 0.012 || verticalDelta > 0.095;
              if (turnedSide || turnedVertical) {
                lookingAway = true;
                if (now - lastGazeLogTime > 5000) {
                  lastGazeLogTime = now;
                  setInfractions(p => [...p, { infractionType: "LOOK_AWAY", timestamp: new Date().toISOString() }]);
                  pushLog(`⚠ LOOKING_AWAY — candidate eyes/head turned away from screen.`, "danger");
                }
              }
            }
          }
        }

        setRealtimeAlerts({ noFace, multipleFaces, lookingAway, loudNoise: isLoud });
      }

      animationFrameId = requestAnimationFrame(checkFrame);
    };

    animationFrameId = requestAnimationFrame(checkFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [pushLog, handleInterruption]);

  // ── Finish & Evaluate Live Session ────────────────────────────────
  const handleEndLiveSession = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    pushLog("📤 Concluding live session and initiating grading pipeline...", "system");

    stopMicStreaming();
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const res = await API.post("/interview/live-complete", {
        sessionId,
        conversation
      });

      pushLog("🏁 Live interview graded successfully!", "success");
      onComplete(res.data.evaluation);
    } catch (err) {
      pushLog(`Grading error: ${err.response?.data?.error || err.message}`, "error");
      setIsSubmitting(false);
    }
  };

  // ── Auto Scroll Panels ────────────────────────────────────────────
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [guardrailLogs]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, aiTextResponse]);

  const logColors = {
    info: "text-gray-400",
    success: "text-emerald-400",
    warning: "text-yellow-400",
    danger: "text-rose-400",
    error: "text-rose-500",
    system: "text-indigo-400",
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  if (!interviewStarted) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6 animate-scale-in">
        <div className="glass-card-strong p-8 space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <FiCpu className="text-3xl animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Live AI Voice Call</h3>
            <p className="text-sm text-gray-400 mt-2">
              Ready to start a live bidirectional voice conversation with our AI interviewer.
            </p>
          </div>
          
          <div className="space-y-3 text-left bg-navy-950/40 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Natural bidirectional speech (no buttons)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Supports live speech interruption</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Real-time cheating detection active</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!roleConfig) return;
              setInterviewStarted(true);
              startLiveSession(roleConfig);
            }}
            disabled={!roleConfig}
            className="btn-primary w-full py-4 text-base"
          >
            {roleConfig ? "Connect & Start Call" : "Loading Session Context..."}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in grid gap-6 lg:grid-cols-3">
      {/* ── Left Column: Call State & Conversation Transcript ──────── */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Live Call Center Stage */}
        <div className="glass-card-strong p-8 text-center flex flex-col items-center justify-center relative overflow-hidden h-[340px] cyber-glow">
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-xs">
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">Gemini 2.0 Live</span>
          </div>

          {/* Glowing Orb Speaker Centerpiece */}
          <div className="relative mb-6">
            <div className={`absolute -inset-4 rounded-full blur-xl opacity-30 transition-all duration-500 ${
              aiSpeaking ? "bg-indigo-500 scale-125" : "bg-cyan-500 scale-100"
            }`} />
            <div className={`h-24 w-24 rounded-full flex items-center justify-center border transition-all duration-500 relative z-10 ${
              aiSpeaking 
                ? "border-indigo-400 bg-indigo-950/80 shadow-[0_0_20px_rgba(99,102,241,0.4)] pulse-ring" 
                : "border-cyan-500 bg-cyan-950/20"
            }`}>
              <FiCpu className={`text-4xl transition ${aiSpeaking ? "text-indigo-400" : "text-cyan-400"}`} />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <h4 className="text-lg font-bold text-white">
              {aiSpeaking ? "AI is Speaking..." : "AI is Listening..."}
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {aiSpeaking 
                ? "Speak to interrupt the AI if you want to answer or ask something." 
                : "Say hello or explain your answer. Your microphone is active."
              }
            </p>
          </div>

          {/* AI Speaking Sound Waves */}
          {aiSpeaking && (
            <div className="flex items-center gap-2 mt-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg px-4 py-1.5 animate-pulse">
              <div className="ai-speaking-bars">
                <span /><span /><span /><span /><span />
              </div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Audio Stream Active</span>
            </div>
          )}
        </div>

        {/* Real-time Transcription Log */}
        <div className="glass-card p-6 flex flex-col" style={{ height: "340px" }}>
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-white/5 pb-3">
            Live Call Transcription
          </h4>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            {conversation.length === 0 && !aiTextResponse && (
              <p className="text-sm text-gray-500 italic text-center py-10">Start speaking to begin transcribing the call...</p>
            )}
            
            {conversation.map((turn, i) => (
              <div 
                key={i} 
                className={`flex gap-3 text-sm animate-fade-in ${
                  turn.sender === "You" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 leading-relaxed ${
                  turn.sender === "You" 
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-200" 
                    : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-200"
                }`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mb-1">
                    {turn.sender}
                  </p>
                  <p className="text-sm">{turn.text}</p>
                </div>
              </div>
            ))}

            {/* Live streaming candidate transcript chunk */}
            {interimCandidateSpeech && (
              <div className="flex justify-end gap-3 text-sm animate-pulse">
                <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-cyan-500/5 border border-cyan-500/10 text-cyan-300">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mb-1">You (Speaking)</p>
                  <p className="text-sm">{interimCandidateSpeech}</p>
                </div>
              </div>
            )}

            {/* Live streaming AI text generation chunk */}
            {aiTextResponse && (
              <div className="flex justify-start gap-3 text-sm animate-pulse">
                <div className="max-w-[80%] rounded-xl px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mb-1">AI</p>
                  <p className="text-sm">{aiTextResponse}</p>
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Live Interface Controllers */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-center ${
                  isMuted 
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" 
                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <FiMicOff className="text-lg" /> : <FiMic className="text-lg" />}
              </button>
              <span className="text-xs text-gray-500">
                {isMuted ? "Microphone muted" : "Microphone transmitting live"}
              </span>
            </div>

            <button
              onClick={handleEndLiveSession}
              disabled={isSubmitting}
              className="btn-danger py-3 px-6 text-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing Grade Report...
                </>
              ) : (
                <>
                  <FiPhoneOff className="text-base" />
                  End Interview
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ── Right Column: Camera & Guardrail Telemetry Logs ────────── */}
      <div className="space-y-6">
        
        {/* Camera Sandbox Container */}
        <div className="glass-card-strong overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 bg-navy-950/50">
            <div className={`h-2.5 w-2.5 rounded-full ${webcamActive ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="text-xs font-semibold text-gray-400">
              Camera Sandbox {webcamActive ? "Active" : "Unavailable"}
            </span>
          </div>
          <div className="relative aspect-[4/3] bg-navy-950">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <FiPhoneOff className="mx-auto text-4xl text-gray-600" />
                  <p className="text-xs text-gray-500">Enable camera access</p>
                </div>
              </div>
            )}
            
            {/* Realtime Bounding Corner Accents */}
            {webcamActive && (
              <div className="absolute inset-3 pointer-events-none">
                <div className="absolute top-0 left-0 h-6 w-6 border-l-2 border-t-2 border-indigo-400/50 rounded-tl" />
                <div className="absolute top-0 right-0 h-6 w-6 border-r-2 border-t-2 border-indigo-400/50 rounded-tr" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-l-2 border-b-2 border-indigo-400/50 rounded-bl" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-r-2 border-b-2 border-indigo-400/50 rounded-br" />
              </div>
            )}

            {/* Live Camera Infraction Alerts */}
            {webcamActive && (
              <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 pointer-events-none z-20">
                {realtimeAlerts.noFace && (
                  <div className="rounded-xl bg-rose-600/90 border border-rose-500/50 px-4 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                    ⚠️ Candidate Absent
                  </div>
                )}
                {realtimeAlerts.multipleFaces && (
                  <div className="rounded-xl bg-rose-600/90 border border-rose-500/50 px-4 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                    ⚠️ Multiple People Detected
                  </div>
                )}
                {realtimeAlerts.lookingAway && (
                  <div className="rounded-xl bg-yellow-600/90 border border-yellow-500/50 px-4 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                    ⚠️ Looking Away Detected
                  </div>
                )}
                {realtimeAlerts.loudNoise && (
                  <div className="rounded-xl bg-yellow-600/90 border border-yellow-500/50 px-4 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                    ⚠️ Audio Interrupt Warning
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Behavioral Guardrail Logs Terminal */}
        <div className="terminal-window flex flex-col h-[320px]">
          <div className="flex items-center gap-2 border-b border-indigo-500/10 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-xs font-semibold text-indigo-400">behavioral_guardrail_feed</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {guardrailLogs.length === 0 && (
              <p className="text-xs text-gray-600 italic">Waiting for tracking feed...</p>
            )}
            {guardrailLogs.map((log, i) => (
              <div key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                <span className={logColors[log.type] || "text-gray-400"}>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Infraction Count Panel */}
        {infractions.length > 0 && (
          <div className="glass-card border-rose-500/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-rose-400">Total Tracking Warnings</span>
              <span className="badge-rose">{infractions.length}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
