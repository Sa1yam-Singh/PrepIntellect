import { useState, useEffect, useRef, useCallback } from "react";
import { FiMic, FiMicOff, FiSend, FiX, FiCheckCircle, FiChevronRight, FiFileText, FiMessageSquare, FiAlertCircle, FiCode, FiHelpCircle, FiZap, FiCpu } from "react-icons/fi";
import axios from "axios";
import Editor from "@monaco-editor/react";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

export default function PracticeSession({ questionText, user, onClose, addToast, refreshUser }) {
  const [mode, setMode] = useState("voice"); // "voice", "text", "code"
  const [textAnswer, setTextAnswer] = useState("");
  const [codeAnswer, setCodeAnswer] = useState(`// Write your SDE coding solution here...
// Make sure to implement the optimal time & space complexity approach.

function solve() {
  // Your code here
  
}`);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  
  // AI Hint states
  const [hint, setHint] = useState("");
  const [askingHint, setAskingHint] = useState(false);
  
  // Code Complexity feedback
  const [codeRubric, setCodeRubric] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const [fillerCount, setFillerCount] = useState(0);
  const [wpm, setWpm] = useState(0);

  // Audio waveform animation state
  const [audioLevels, setAudioLevels] = useState(Array(15).fill(10));
  
  // AI score panel states
  const [scoring, setScoring] = useState(false);
  const [rubric, setRubric] = useState(null); // { overallScore, dimensions: { structure: { score, comment }... }, suggestions: [] }
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const levelIntervalRef = useRef(null);

  // ── Filler Words Detection & Highlights ──────────────────────────
  const FILLER_REGEX = /\b(um|uh|like|you\s+know|ah|so)\b/gi;

  const getHighlightedTranscript = (text) => {
    if (!text) return "";
    const parts = text.split(FILLER_REGEX);
    return parts.map((part, index) => {
      if (part.toLowerCase().match(/^(um|uh|like|you\s+know|ah|so)$/)) {
        return (
          <span 
            key={index} 
            className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 rounded font-bold transition-all duration-300"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const countFillersAndCalculateWPM = useCallback((text, durationSeconds) => {
    if (!text) {
      setFillerCount(0);
      setWpm(0);
      return;
    }
    const matches = text.match(FILLER_REGEX);
    setFillerCount(matches ? matches.length : 0);

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = durationSeconds / 60;
    const computedWpm = minutes > 0 ? Math.round(words / minutes) : 0;
    setWpm(computedWpm);
  }, []);

  // ── Start Speech Recognition ──────────────────────────────────────
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        addToast("Web Speech API is not supported in this browser. Please use text mode or Chrome.", "error");
        setIsVoiceMode(false);
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e) => {
        let finalTrans = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTrans += e.results[i][0].transcript;
          }
        }
        if (finalTrans) {
          setTranscribedText((prev) => {
            const updated = (prev + " " + finalTrans).trim();
            countFillersAndCalculateWPM(updated, recordingSeconds + 1);
            return updated;
          });
        }
      };

      rec.onerror = (err) => {
        console.error("Speech Recognition Error", err);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.error(e);
    }
  };

  // ── Stop Speech Recognition ───────────────────────────────────────
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // ── Audio Waveform Visualizer ─────────────────────────────────────
  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Take a slice and map values for 15 visualizer bars
        const levels = Array.from(dataArray)
          .slice(0, 15)
          .map(val => Math.max(10, Math.min(95, Math.round(val / 2.7))));
          
        setAudioLevels(levels);
      }, 80);

    } catch (err) {
      console.error("Mic stream visualizer failed", err);
    }
  };

  const stopAudioVisualizer = () => {
    if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setAudioLevels(Array(15).fill(10));
  };

  // ── Recording Toggles ─────────────────────────────────────────────
  const toggleRecording = () => {
    if (isRecording) {
      // STOP RECORDING
      setIsRecording(false);
      stopSpeechRecognition();
      stopAudioVisualizer();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      addToast("Recording completed.", "success");
    } else {
      // START RECORDING
      setTranscribedText("");
      setRecordingSeconds(0);
      setWpm(0);
      setFillerCount(0);
      setIsRecording(true);
      
      startSpeechRecognition();
      startAudioVisualizer();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          // 3-minute max limit = 180 seconds
          if (next >= 180) {
            setIsRecording(false);
            stopSpeechRecognition();
            stopAudioVisualizer();
            clearInterval(recordingTimerRef.current);
            addToast("Maximum 3-minute answer limit reached.", "warning");
          }
          return next;
        });
      }, 1000);
    }
  };

  // ── Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts inside text inputs or Monaco Editor unless submitting with Ctrl+Enter
      const isInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.className?.includes("inputarea");
      
      // Ctrl + Enter to submit
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (mode === "code") {
          handleSubmitCode();
        } else {
          handleSubmitAnswer();
        }
      }
      
      // R to toggle recording (only if not inside inputs and voice mode active)
      if (e.key.toLowerCase() === "r" && !isInput && mode === "voice" && !rubric) {
        e.preventDefault();
        toggleRecording();
      }
      
      // Esc to exit
      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestExit();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isRecording, textAnswer, codeAnswer, codeLanguage, transcribedText, rubric, codeRubric]);

  // Sync speech stats on time updates
  useEffect(() => {
    if (isRecording && transcribedText) {
      countFillersAndCalculateWPM(transcribedText, recordingSeconds);
    }
  }, [recordingSeconds, transcribedText, isRecording, countFillersAndCalculateWPM]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
      stopMicStreaming();
    };
  }, []);

  const stopMicStreaming = () => {
    stopSpeechRecognition();
    stopAudioVisualizer();
  };

  // ── Submit Answer Scorer ──────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    const finalAnswerText = mode === "voice" ? transcribedText : textAnswer;

    if (!finalAnswerText.trim()) {
      addToast("Please record or write an answer first.", "warning");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      stopSpeechRecognition();
      stopAudioVisualizer();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }

    setScoring(true);
    addToast("Scoring response with AI...", "info");

    try {
      const res = await API.post("/practice/score", {
        question: questionText,
        answer: finalAnswerText,
        email: user?.email
      });
      setRubric(res.data);
      if (res.data.xpAwarded) {
        addToast(`Grading complete! +${res.data.xpAwarded} XP awarded.`, "success");
      } else {
        addToast("Grading complete!", "success");
      }
      if (typeof refreshUser === "function") {
        refreshUser();
      }
    } catch (err) {
      console.error(err);
      addToast("AI evaluation failed. Please try again.", "error");
    } finally {
      setScoring(false);
    }
  };

  // ── Submit Code Scorer ────────────────────────────────────────────
  const handleSubmitCode = async () => {
    if (!codeAnswer.trim()) {
      addToast("Please write some code first.", "warning");
      return;
    }

    setScoring(true);
    addToast("Evaluating solution & Big-O complexity...", "info");

    try {
      const res = await API.post("/practice/score-code", {
        question: questionText,
        code: codeAnswer,
        language: codeLanguage,
        email: user?.email
      });
      setCodeRubric(res.data);
      if (res.data.xpAwarded) {
        addToast(`Evaluation complete! +${res.data.xpAwarded} XP awarded.`, "success");
      } else {
        addToast("Evaluation complete!", "success");
      }
      if (typeof refreshUser === "function") {
        refreshUser();
      }
    } catch (err) {
      console.error(err);
      addToast("AI evaluation failed. Please try again.", "error");
    } finally {
      setScoring(false);
    }
  };

  // ── Request AI Hint ───────────────────────────────────────────────
  const handleAskHint = async () => {
    setAskingHint(true);
    setHint("");
    addToast("Requesting AI hint...", "info");
    try {
      const res = await API.post("/practice/hint", {
        question: questionText,
        code: codeAnswer,
        language: codeLanguage
      });
      setHint(res.data.hint);
      addToast("Conceptual hint loaded!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to generate hint.", "error");
    } finally {
      setAskingHint(false);
    }
  };

  const handleRequestExit = () => {
    const hasUnsaved = (mode === "voice" ? transcribedText : mode === "text" ? textAnswer : codeAnswer).trim();
    const evaluated = rubric || codeRubric;
    if (hasUnsaved && !evaluated) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const getWpmStatusColor = (val) => {
    if (val === 0) return "text-gray-500";
    if (val >= 120 && val <= 150) return "text-emerald-400 font-bold";
    if (val >= 100 && val <= 170) return "text-yellow-400";
    return "text-rose-400";
  };

  const getWpmStatusText = (val) => {
    if (val === 0) return "Not speaking yet";
    if (val >= 120 && val <= 150) return "Ideal pace (120-150)";
    if (val < 120) return "Too slow (<120)";
    return "Too fast (>150)";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl glass-card-strong p-6 md:p-8 animate-scale-in text-left">
        
        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5">
          <div className="space-y-0.5">
            <span className="badge-purple text-[10px] font-extrabold uppercase tracking-wider">Practice mode</span>
            <h3 className="text-xl font-bold text-white">Single-Question Sandbox</h3>
          </div>
          <button 
            onClick={handleRequestExit}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition"
            title="Exit Session (Esc)"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="p-5 rounded-xl border border-white/5 bg-navy-950/60 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-extrabold block mb-1">Question</span>
          <p className="text-sm font-semibold text-gray-200 leading-relaxed">{questionText}</p>
        </div>

        {(!rubric && !codeRubric) ? (
          /* Answer Input Area */
          <div className="space-y-6">
            
            {/* Toggle Modes */}
            <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-1.5 max-w-[300px]">
              <button 
                onClick={() => { stopMicStreaming(); setMode("voice"); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  mode === "voice" 
                    ? "bg-indigo-600 text-white font-bold" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <FiMic /> Voice
              </button>
              <button 
                onClick={() => { stopMicStreaming(); setMode("text"); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  mode === "text" 
                    ? "bg-indigo-600 text-white font-bold" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <FiMessageSquare /> Text
              </button>
              <button 
                onClick={() => { stopMicStreaming(); setMode("code"); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  mode === "code" 
                    ? "bg-indigo-600 text-white font-bold" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <FiCode /> Code
              </button>
            </div>

            {mode === "voice" && (
              /* VOICE MODE CONTROLS */
              <div className="space-y-6 text-center py-4 relative">
                
                {/* 3-Min Timer */}
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-gray-400">
                  <span>Duration:</span>
                  <span className={`font-bold ${recordingSeconds >= 150 ? "text-rose-400" : "text-gray-200"}`}>
                    {(() => {
                      const m = Math.floor(recordingSeconds / 60);
                      const s = recordingSeconds % 60;
                      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                    })()}
                  </span>
                  <span>/ 03:00</span>
                </div>

                {/* Mic Pulsing Button & Audio Waveform */}
                <div className="flex flex-col items-center justify-center gap-5">
                  <div className="flex items-center gap-1.5 justify-center h-12 w-[180px]">
                    {isRecording ? (
                      audioLevels.map((lvl, index) => (
                        <div 
                          key={index} 
                          className="waveform-bar w-1" 
                          style={{ height: `${lvl}%` }} 
                        />
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">Microphone idle</span>
                    )}
                  </div>

                  <button
                    onClick={toggleRecording}
                    className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isRecording 
                        ? "bg-rose-600 shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:bg-rose-500 scale-105 animate-pulse" 
                        : "bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-500 hover:scale-105 active:scale-95"
                    }`}
                    title="Toggle Recording (Press R)"
                  >
                    {isRecording ? <FiMicOff className="text-2xl text-white" /> : <FiMic className="text-2xl text-white animate-pulse" />}
                  </button>

                  <p className="text-xs text-gray-500">
                    {isRecording ? "Press R or click to stop recording." : "Press R or click to start recording (3 mins max)."}
                  </p>
                </div>

                {/* Speech metrics dynamic display */}
                {transcribedText && (
                  <div className="p-4 rounded-xl border border-white/5 bg-navy-950/40 text-left space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Word Pace</span>
                        <span className={`text-sm font-bold ${getWpmStatusColor(wpm)}`}>{wpm} WPM</span>
                        <span className="block text-[8px] text-gray-500 font-medium mt-0.5">{getWpmStatusText(wpm)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Filler words</span>
                        <span className={`text-sm font-bold ${fillerCount > 4 ? "text-rose-400" : "text-cyan-400"}`}>{fillerCount} detected</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="block text-[9px] uppercase font-bold text-gray-500 tracking-wider">Time Limit</span>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${(recordingSeconds / 180) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Live Transcript</span>
                      <p className="text-xs text-gray-300 bg-navy-950/80 p-3 rounded-lg border border-white/5 max-h-[120px] overflow-y-auto leading-relaxed">
                        {getHighlightedTranscript(transcribedText)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === "text" && (
              /* TEXT MODE CONTROLS */
              <div className="space-y-3">
                <label htmlFor="textAnswer" className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Type Your Response
                </label>
                <textarea
                  id="textAnswer"
                  rows={6}
                  placeholder="Draft your structured answer here (Ctrl+Enter to submit)..."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="auth-input resize-none bg-navy-950"
                />
                <p className="text-[10px] text-gray-500 font-medium text-right">Ctrl + Enter is the shortcut to submit answers instantly.</p>
              </div>
            )}

            {mode === "code" && (
              /* CODE MODE CONTROLS */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label htmlFor="codeLanguage" className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                    SDE Practice Editor
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Lang:</span>
                    <select
                      id="codeLanguage"
                      value={codeLanguage}
                      onChange={(e) => {
                        const lang = e.target.value;
                        setCodeLanguage(lang);
                        if (codeAnswer.startsWith("// Write your")) {
                          if (lang === "python") {
                            setCodeAnswer(`# Write your SDE coding solution here...\n# Make sure to implement the optimal time & space complexity approach.\n\ndef solve():\n    pass`);
                          } else if (lang === "cpp") {
                            setCodeAnswer(`// Write your SDE coding solution here...\n#include <iostream>\nusing namespace std;\n\nvoid solve() {\n    // Code\n}`);
                          } else if (lang === "java") {
                            setCodeAnswer(`// Write your SDE coding solution here...\npublic class Solution {\n    public void solve() {\n        // Code\n    }\n}`);
                          } else {
                            setCodeAnswer(`// Write your SDE coding solution here...\n\nfunction solve() {\n  // Code\n}`);
                          }
                        }
                      }}
                      className="bg-navy-900 border border-white/10 text-xs rounded-lg px-2.5 py-1 text-white font-semibold outline-none focus:border-indigo-500"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                    </select>
                  </div>
                </div>

                {/* Monaco Editor Wrapper */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#1e1e1e] h-[260px] relative">
                  <Editor
                    height="100%"
                    language={codeLanguage === "cpp" ? "cpp" : codeLanguage === "python" ? "python" : codeLanguage === "java" ? "java" : "javascript"}
                    theme="vs-dark"
                    value={codeAnswer}
                    onChange={(val) => setCodeAnswer(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollbar: { vertical: "visible", horizontal: "auto" },
                      lineNumbersMinChars: 3,
                      automaticLayout: true,
                      tabSize: 2,
                      scrollBeyondLastLine: false,
                      padding: { top: 8, bottom: 8 }
                    }}
                  />
                </div>

                {/* AI Hint Section */}
                {hint && (
                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 flex items-start gap-2.5 animate-fade-in">
                    <FiHelpCircle className="shrink-0 text-base mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-amber-500">AI Conceptual Hint</span>
                      <p className="leading-relaxed">{hint}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleAskHint}
                    disabled={askingHint}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {askingHint ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading Hint...
                      </>
                    ) : (
                      <>
                        <FiHelpCircle className="text-sm" /> Ask AI Hint
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-500 font-medium font-mono">Ctrl + Enter to compile & grade</p>
                </div>
              </div>
            )}

            {/* Actions submit button */}
            <div className="flex gap-3 justify-end pt-3">
              <button 
                type="button" 
                onClick={handleRequestExit} 
                className="btn-secondary w-[120px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={mode === "code" ? handleSubmitCode : handleSubmitAnswer}
                disabled={scoring || (mode === "voice" ? !transcribedText.trim() : mode === "text" ? !textAnswer.trim() : !codeAnswer.trim())}
                className="btn-primary flex-1 max-w-[200px]"
              >
                {scoring ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "code" ? "Analyzing code..." : "Grading answer..."}
                  </>
                ) : (
                  <>
                    Submit Solution <FiSend className="text-xs" />
                  </>
                )}
              </button>
            </div>

          </div>
        ) : rubric ? (
          /* AI Score Rubric Report view (Voice / Text) */
          <div className="space-y-6">
            
            {/* Overall Score Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg font-bold text-white">Answer Scoring Analysis</h4>
                <p className="text-xs text-gray-400">Score evaluated on 5 key communication dimensions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-500">Average:</span>
                <span className="h-16 w-16 rounded-full border-2 border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center font-extrabold text-cyan-400 text-xl shadow-glow">
                  {rubric.overallScore}%
                </span>
              </div>
            </div>

            {/* 5 Progress Bars */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Dimension Scores</h5>
              <div className="space-y-3.5">
                {Object.entries(rubric.dimensions || {}).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="capitalize text-gray-300 font-bold">{key}</span>
                      <span className="text-indigo-400 font-bold">{value.score} / 10</span>
                    </div>
                    {/* Progress container */}
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full"
                        style={{ width: `${value.score * 10}%` }}
                      />
                    </div>
                    {/* comment */}
                    <p className="text-[11px] text-gray-400 italic">“{value.comment}”</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions Panel */}
            <div className="p-5 rounded-xl border border-white/5 bg-navy-950/40 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Actionable Suggestions</h5>
              <ul className="space-y-2.5">
                {rubric.suggestions?.map((s, index) => (
                  <li key={index} className="flex gap-2.5 text-xs text-gray-300 items-start">
                    <FiCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exit CTA */}
            <div className="flex gap-3 justify-end pt-3">
              <button 
                onClick={onClose} 
                className="btn-primary w-full max-w-[200px]"
              >
                Close Sandbox <FiChevronRight />
              </button>
            </div>

          </div>
        ) : (
          /* CODE GRADING REPORT VIEW (LeetCode-style Big-O Complexity Feedback) */
          <div className="space-y-6 animate-fade-in">
            
            {/* Overall Score & Complexity Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="space-y-2 text-center sm:text-left flex-1">
                <span className="badge bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] uppercase font-extrabold tracking-wider">SDE Code Review</span>
                <h4 className="text-lg font-bold text-white">SDE Algorithm Assessment</h4>
                
                {/* Big-O Badges */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <FiZap /> Time: <span className="font-bold">{codeRubric.complexityAnalysis?.time || "O(N)"}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                    <FiCpu /> Space: <span className="font-bold">{codeRubric.complexityAnalysis?.space || "O(1)"}</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-gray-400 leading-relaxed pt-1 font-medium">{codeRubric.complexityAnalysis?.explanation}</p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Score Rating</span>
                <span className="h-16 w-16 rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center font-extrabold text-indigo-400 text-xl shadow-glow">
                  {codeRubric.overallScore}%
                </span>
              </div>
            </div>

            {/* Code Dimensions Breakdown */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Algorithmic Criteria</h5>
              <div className="space-y-3.5">
                {Object.entries(codeRubric.dimensions || {}).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="capitalize text-gray-300 font-bold">
                        {key === "timeComplexity" ? "Time Complexity" : key === "spaceComplexity" ? "Space Complexity" : key === "optimalApproach" ? "Optimal Approach" : key}
                      </span>
                      <span className="text-indigo-400 font-bold">{value.score} / 10</span>
                    </div>
                    {/* Progress container */}
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full"
                        style={{ width: `${value.score * 10}%` }}
                      />
                    </div>
                    {/* comment */}
                    <p className="text-[11px] text-gray-400 italic font-medium">“{value.comment}”</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Suggestions */}
            <div className="p-5 rounded-xl border border-white/5 bg-navy-950/40 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Refactoring & Optimization Tips</h5>
              <ul className="space-y-2.5">
                {codeRubric.suggestions?.map((s, index) => (
                  <li key={index} className="flex gap-2.5 text-xs text-gray-300 items-start">
                    <FiCheckCircle className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exit CTA */}
            <div className="flex gap-3 justify-end pt-3">
              <button 
                onClick={onClose} 
                className="btn-primary w-full max-w-[200px]"
              >
                Close Sandbox <FiChevronRight />
              </button>
            </div>

          </div>
        )}

        {/* Exit Confirm Modal Drawer */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm glass-card-strong p-6 space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl animate-pulse">
                <FiAlertCircle />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">Unsaved Practice Answer</h4>
                <p className="text-xs text-gray-400">You are in the middle of drafting an answer. Exiting now will lose your progress. Are you sure?</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExitConfirm(false)} className="btn-secondary w-full py-2 text-xs">Keep Drafting</button>
                <button onClick={() => { setShowExitConfirm(false); onClose(); }} className="btn-danger w-full py-2 text-xs">Exit Sandbox</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
