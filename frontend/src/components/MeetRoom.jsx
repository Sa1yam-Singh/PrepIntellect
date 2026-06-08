import { useState, useEffect, useRef } from "react";
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiTv, FiMessageSquare, 
  FiCode, FiLogOut, FiCopy, FiCheckCircle, FiSend, FiUser, FiPlay 
} from "react-icons/fi";

export default function MeetRoom({ code, onLeave, isPeerMatch }) {
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Tab control: "chat" | "editor"
  const [activeTab, setActiveTab] = useState("editor");
  
  // Peer state: 'waiting' | 'connected'
  const [peerState, setPeerState] = useState("waiting");
  const [peerName, setPeerName] = useState("Waiting for partner...");
  const [peerRole, setPeerRole] = useState("");
  
  // Camera stream refs
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  
  // Chat list
  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState([
    { sender: "System", text: `Room ${code} created. Share the code to invite others.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  
  // Code editor state
  const [codeContent, setCodeContent] = useState(
    `// Solve the coding problem here\n\nfunction findDuplicates(arr) {\n  const seen = new Set();\n  const duplicates = [];\n  \n  for (const num of arr) {\n    if (seen.has(num)) {\n      duplicates.push(num);\n    } else {\n      seen.add(num);\n    }\n  }\n  \n  return duplicates;\n}\n\n// Test call\nconsole.log(findDuplicates([1, 2, 3, 1, 4, 2]));`
  );
  
  // Peer response list
  const peerReplies = useRef([
    "Hey! Thanks for joining. Ready to practice? Let's take turns doing coding rounds.",
    "Nice to meet you! Do you want to go first with the algorithm question, or should I start?",
    "Awesome, let's use the code panel next to the video. I've pasted a duplicate detection template. Let me know what you think of the approach.",
    "That makes total sense. How would you handle scaling if the input array size exceeds physical memory?",
    "Perfect solution. Let's wrap up this round and do a quick review of the time complexity!"
  ]);
  const replyIndex = useRef(0);

  // Initialize Webcam Stream
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Could not access camera/mic stream:", err.message);
        setCamActive(false);
      }
    }
    
    startCamera();
    
    // Simulate peer joining after 4 seconds only if it's a computer-based peer match
    let peerTimer;
    if (isPeerMatch) {
      peerTimer = setTimeout(() => {
        setPeerState("connected");
        setPeerName("Sarah D.");
        setPeerRole("Senior Frontend Candidate @ Google");
        setChats(prev => [
          ...prev,
          { 
            sender: "System", 
            text: "Sarah D. has joined the session.", 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          },
          {
            sender: "Sarah D.",
            text: "Hi there! Glad to connect. Let's get started.",
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }
        ]);
      }, 4000);
    }

    return () => {
      if (peerTimer) clearTimeout(peerTimer);
      // Clean up webcam tracks on exit
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [code]);

  // Handle Mute Mic
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  // Handle Cam Toggle
  const toggleCam = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !camActive;
      });
    }
    setCamActive(!camActive);
  };

  // Toggle Simulated Screen Share
  const toggleScreenShare = () => {
    setSharingScreen(!sharingScreen);
    if (!sharingScreen) {
      setChats(prev => [
        ...prev,
        {
          sender: "System",
          text: "You started sharing your screen.",
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }
      ]);
    } else {
      setChats(prev => [
        ...prev,
        {
          sender: "System",
          text: "You stopped sharing your screen.",
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }
      ]);
    }
  };

  // Copy Code Room link
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const userMsg = {
      sender: "You",
      text: chatMessage,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setChats(prev => [...prev, userMsg]);
    setChatMessage("");
    
    // Simulate peer typing and replying
    if (peerState === "connected") {
      setTimeout(() => {
        const text = peerReplies.current[replyIndex.current % peerReplies.current.length];
        replyIndex.current += 1;
        
        setChats(prev => [
          ...prev,
          {
            sender: "Sarah D.",
            text: text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }
        ]);
      }, 1500);
    }
  };

  // Simulated code execution
  const handleRunCode = () => {
    alert("Executing script...\n\nResult:\n[1, 2]");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-navy-950/80 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl animate-fade-in">
      
      {/* ── Top Meeting Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-navy-900/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <FiVideo className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Peer Mock Interview Chamber</h2>
            <p className="text-xs text-gray-400">Collaborative Coding & Live Telemetry</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-navy-950/80 border border-white/5 px-4 py-2 rounded-xl text-sm">
          <span className="text-gray-400 select-none">Code:</span>
          <span className="font-mono text-cyan-400 font-bold">{code}</span>
          <button 
            onClick={handleCopyCode}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition"
            title="Copy Meeting Room Token"
          >
            {copied ? <FiCheckCircle className="text-emerald-400" /> : <FiCopy />}
          </button>
        </div>

        <button 
          onClick={onLeave}
          className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/25 transition active:scale-[0.98]"
        >
          <FiLogOut /> Leave Room
        </button>
      </div>

      {/* ── Main Workspace split view ── */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Video Panels */}
        <div className="lg:w-1/2 p-6 flex flex-col justify-center gap-6 bg-navy-950/30 overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 w-full">
            
            {/* Local Video panel */}
            <div className="relative aspect-video rounded-2xl border border-white/10 bg-navy-900/50 overflow-hidden shadow-lg group">
              {camActive ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="h-full w-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950 text-gray-400">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold mb-2">
                    {user?.name?.charAt(0).toUpperCase() || "Y"}
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">Camera is Turned Off</span>
                </div>
              )}
              
              {/* Overlay Label */}
              <div className="absolute bottom-3 left-3 bg-navy-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white border border-white/5">
                You {sharingScreen && "• Sharing Screen"}
              </div>

              {/* Local volume bar indicators */}
              {micActive && (
                <div className="absolute top-3 right-3 flex gap-0.5 items-end h-4">
                  <span className="w-0.5 bg-cyan-400 h-2 animate-pulse" />
                  <span className="w-0.5 bg-cyan-400 h-3 animate-pulse" style={{animationDelay: '0.2s'}} />
                  <span className="w-0.5 bg-cyan-400 h-1 animate-pulse" style={{animationDelay: '0.4s'}} />
                </div>
              )}
            </div>

            {/* Remote Peer Video Panel */}
            <div className="relative aspect-video rounded-2xl border border-white/10 bg-navy-900/50 overflow-hidden shadow-lg flex items-center justify-center">
              
              {peerState === "waiting" ? (
                <div className="text-center p-6 bg-navy-900/50 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center h-full max-w-[280px]">
                  <div className="flex items-center justify-center mb-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-200">Waiting for peer...</h4>
                  {isPeerMatch ? (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Searching for online matches... Sarah D. will join in a moment.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <p className="text-[10px] text-gray-400">
                        This is your private session room. Share the code to invite others:
                      </p>
                      <div className="bg-navy-950 px-3 py-1.5 rounded font-mono text-cyan-400 text-xs font-bold border border-white/5 truncate select-all">
                        {code}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 bg-[#070b13] flex flex-col items-center justify-center p-6 text-center">
                  
                  {/* Remote Peer Avatar representation */}
                  <div className="relative mb-3">
                    <div className="w-20 h-20 rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-600/10 to-indigo-600/20 flex items-center justify-center text-2xl font-bold text-cyan-300 shadow-inner">
                      S
                    </div>
                    {/* Live indicator badge */}
                    <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-emerald-500 border-2 border-navy-950 ring-2 ring-emerald-500/20 animate-pulse" />
                  </div>

                  <h4 className="text-sm font-bold text-white">{peerName}</h4>
                  <p className="text-[10px] text-cyan-400 font-semibold">{peerRole}</p>
                  
                  {/* Pulsing wave indicators */}
                  <div className="flex gap-1 items-center justify-center mt-4 h-6">
                    <span className="w-1 bg-cyan-400/80 rounded h-3 animate-pulse" style={{animationDelay: '0.1s'}} />
                    <span className="w-1 bg-cyan-400/80 rounded h-5 animate-pulse" style={{animationDelay: '0.3s'}} />
                    <span className="w-1 bg-cyan-400/80 rounded h-2 animate-pulse" style={{animationDelay: '0.5s'}} />
                    <span className="w-1 bg-cyan-400/80 rounded h-4 animate-pulse" style={{animationDelay: '0.2s'}} />
                    <span className="w-1 bg-cyan-400/80 rounded h-1 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Overlay Label */}
              {peerState === "connected" && (
                <div className="absolute bottom-3 left-3 bg-navy-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white border border-white/5">
                  Sarah D.
                </div>
              )}
            </div>

          </div>

          {/* Control Bar Overlay */}
          <div className="flex items-center justify-center gap-4 bg-navy-900/40 p-4 border border-white/5 rounded-2xl w-full max-w-md mx-auto shadow-inner">
            
            {/* Mic control */}
            <button 
              onClick={toggleMic}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition border active:scale-95 ${
                micActive 
                  ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" 
                  : "bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30"
              }`}
              title={micActive ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micActive ? <FiMic className="text-lg" /> : <FiMicOff className="text-lg" />}
            </button>

            {/* Video control */}
            <button 
              onClick={toggleCam}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition border active:scale-95 ${
                camActive 
                  ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" 
                  : "bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30"
              }`}
              title={camActive ? "Stop Camera" : "Start Camera"}
            >
              {camActive ? <FiVideo className="text-lg" /> : <FiVideoOff className="text-lg" />}
            </button>

            {/* Screen Share Control */}
            <button 
              onClick={toggleScreenShare}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition border active:scale-95 ${
                sharingScreen 
                  ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30" 
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              title="Share Screen"
            >
              <FiTv className="text-lg" />
            </button>

          </div>
        </div>

        {/* Right Side: Shared Editor & Chat */}
        <div className="lg:w-1/2 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-navy-900/20 overflow-hidden">
          
          {/* Tab Selection */}
          <div className="flex border-b border-white/10 bg-navy-900/30">
            <button 
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === "editor" 
                  ? "border-cyan-500 text-cyan-400 bg-white/5" 
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <FiCode /> Code Scratchpad
            </button>
            <button 
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === "chat" 
                  ? "border-cyan-500 text-cyan-400 bg-white/5" 
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <FiMessageSquare /> Live Chat Room
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-grow flex flex-col overflow-hidden relative">
            
            {/* Editor Tab */}
            {activeTab === "editor" && (
              <div className="flex-grow flex flex-col overflow-hidden h-full">
                
                {/* Editor Bar */}
                <div className="flex justify-between items-center bg-navy-950/70 px-4 py-2 border-b border-white/5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">JavaScript (Node v18)</span>
                  <button 
                    onClick={handleRunCode}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition active:scale-95"
                  >
                    <FiPlay className="text-[10px]" /> Run Code
                  </button>
                </div>

                {/* Textarea code box */}
                <div className="flex-grow relative h-full">
                  <textarea 
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    className="w-full h-full p-6 bg-[#090d16] font-mono text-xs text-gray-300 outline-none resize-none leading-relaxed border-0"
                    style={{ tabSize: 2 }}
                  />
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="flex-grow flex flex-col overflow-hidden h-full bg-[#080c14]">
                
                {/* Feed list */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5 flex flex-col justify-end">
                  {chats.map((msg, i) => {
                    const isSystem = msg.sender === "System";
                    const isSelf = msg.sender === "You";
                    
                    if (isSystem) {
                      return (
                        <div key={i} className="text-center py-1">
                          <span className="inline-block text-[9px] bg-white/5 border border-white/5 rounded px-2.5 py-0.5 text-gray-400 font-medium font-mono">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={i} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-1.5 mb-1`}>
                          <span className="text-[10px] text-gray-500 font-bold">{msg.sender}</span>
                          <span className="text-[8px] text-gray-600">{msg.time}</span>
                        </div>
                        <div className={`rounded-xl px-4 py-2.5 text-xs max-w-[85%] border leading-relaxed ${
                          isSelf 
                            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200 rounded-tr-none" 
                            : "bg-white/5 border-white/10 text-gray-200 rounded-tl-none"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-navy-950/50 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message to peer..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-grow rounded-xl border border-white/10 bg-[#090d16] px-4 py-3 text-xs text-white placeholder-gray-500 focus:border-cyan-500 outline-none transition"
                  />
                  <button 
                    type="submit"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition active:scale-95"
                  >
                    <FiSend />
                  </button>
                </form>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
