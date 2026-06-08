import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FiCpu, FiUsers, FiPlusCircle, FiLink, FiVideo, FiTrendingUp, 
  FiCalendar, FiClock, FiActivity, FiArrowRight, FiCheckCircle, FiCopy, FiClipboard, FiZap
} from "react-icons/fi";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

export default function DashboardHub({ user, onStartAIMock, onBackToLanding, onJoinMeetRoom }) {
  const [meetingCode, setMeetingCode] = useState("");
  const [roomAction, setRoomAction] = useState(null);
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [peerState, setPeerState] = useState(null);
  const [activeJoinCode, setActiveJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  // Real data from backend
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch real stats and sessions
  useEffect(() => {
    async function fetchData() {
      if (!user?.email) return;
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          API.get(`/stats/${encodeURIComponent(user.email)}`),
          API.get(`/sessions/user/${encodeURIComponent(user.email)}`)
        ]);
        setStats(statsRes.data);
        setRecentSessions(sessionsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err.message);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchData();
  }, [user?.email]);

  const handleCreateRoom = () => {
    const code = "meet-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setCreatedRoomCode(code);
    setRoomAction("create");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    setJoinError("");
    setJoinSuccess("");
    if (!activeJoinCode.trim()) {
      setJoinError("Please enter a room code.");
      return;
    }
    setJoinSuccess("Successfully connected! Initializing meeting room...");
    setTimeout(() => {
      onJoinMeetRoom(activeJoinCode.trim());
      setRoomAction(null);
      setActiveJoinCode("");
      setJoinSuccess("");
    }, 800);
  };

  const handleMatchPeer = () => {
    setPeerState("matching");
    setTimeout(() => {
      setPeerState("matched");
    }, 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getOverallScore = (session) => {
    const e = session.finalEvaluation;
    if (!e) return 0;
    return Math.round(((e.technicalScore || 0) + (e.communicationScore || 0) + (e.problemSolvingScore || 0)) / 3);
  };

  return (
    <div className="space-y-8 py-6">
      
      {/* ── Welcome Banner ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 cyber-glow bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-navy-950"
      >
        {/* Floating orbs */}
        <div className="floating-orb w-[200px] h-[200px] bg-indigo-500/10 top-1/2 right-10 -translate-y-1/2" />
        <div className="floating-orb w-[120px] h-[120px] bg-purple-500/8 bottom-0 left-20" style={{ animationDelay: "2s" }} />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="text-gradient">{user.name}</span>!
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {stats?.totalSessions > 0 
                ? `You've completed ${stats.totalSessions} interview${stats.totalSessions > 1 ? "s" : ""}. Keep the momentum going!`
                : "Ready to crush your interviews? Choose a track below to begin practicing."
              }
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Streak</span>
              <span className="text-lg font-bold text-indigo-400">
                {loadingStats ? "—" : `${stats?.currentStreak || 0} Day${stats?.currentStreak !== 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Avg Score</span>
              <span className="text-lg font-bold text-cyan-400">
                {loadingStats ? "—" : stats?.totalSessions > 0 ? `${stats.avgTechnicalScore}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Grid Container ── */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Main Actions Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold uppercase tracking-wider text-gray-400">Choose Your Interview Track</h3>
          
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Action 1: AI Mock Interview */}
            <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
              className="glass-card-hover p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-5 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition">
                  <FiCpu className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">🤖 AI Mock Interview</h4>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Interactive rounds with voice AI. Get real-time spoken feedback, adaptive questions, and granular scoring from Gemini.
                </p>
              </div>
              <button 
                onClick={onStartAIMock}
                className="btn-primary w-full mt-4"
              >
                Launch AI Mock <FiArrowRight />
              </button>
            </motion.div>

            {/* Action 2: Peer Interview */}
            <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
              className="glass-card-hover p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-5 group-hover:bg-purple-500/20 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition">
                  <FiUsers className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">👥 Match with Peer</h4>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Match instantly with another candidate online. Take turns interviewing each other using peer rubrics.
                </p>
              </div>
              
              {peerState === null && (
                <button 
                  onClick={handleMatchPeer}
                  className="btn-secondary w-full mt-4 border-purple-500/20 hover:border-purple-500/50"
                >
                  Match Online <FiUsers />
                </button>
              )}

              {peerState === 'matching' && (
                <div className="text-center py-2 px-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold flex items-center justify-center gap-2 mt-4">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Matching with a peer...
                </div>
              )}

              {peerState === 'matched' && (
                <div className="space-y-2 mt-4">
                  <div className="text-center py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    Match Found! Connecting to peer session...
                  </div>
                  <button 
                    onClick={() => {
                      const randCode = "meet-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                      onJoinMeetRoom(randCode, true);
                      setPeerState(null);
                    }}
                    className="btn-primary w-full bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    Enter Peer Meet <FiVideo />
                  </button>
                </div>
              )}
            </motion.div>

            {/* Action 3: Create Meet */}
            <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
              className="glass-card-hover p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-5 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition">
                  <FiPlusCircle className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">🔗 Create Meeting Room</h4>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Host your own private coding session. Generate a custom link to invite teammates, peers or mentors.
                </p>
              </div>
              
              {roomAction !== "create" ? (
                <div className="flex flex-col gap-2 mt-4">
                  <button 
                    onClick={handleCreateRoom}
                    className="btn-secondary w-full border-cyan-500/20 hover:border-cyan-500/50"
                  >
                    Generate Prep Room <FiLink />
                  </button>
                  <a 
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full border-emerald-500/20 hover:border-emerald-500/55 hover:bg-emerald-500/5 flex items-center justify-center gap-2"
                  >
                    Start Google Meet <FiVideo className="text-emerald-400" />
                  </a>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between rounded-xl bg-navy-900 border border-white/10 p-2 text-xs">
                    <span className="font-mono text-cyan-400 truncate max-w-[170px]">{createdRoomCode}</span>
                    <button 
                      onClick={handleCopyCode} 
                      className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5"
                    >
                      {copied ? <FiCheckCircle className="text-emerald-400" /> : <FiCopy />}
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      onJoinMeetRoom(createdRoomCode);
                      setRoomAction(null);
                    }}
                    className="btn-primary w-full bg-gradient-to-r from-cyan-600 to-indigo-600"
                  >
                    Launch Meeting
                  </button>
                </div>
              )}
            </motion.div>

            {/* Action 4: Join Meet */}
            <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
              className="glass-card-hover p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-5 group-hover:bg-teal-500/20 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition">
                  <FiVideo className="text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">📋 Join Meeting Room</h4>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  Have a shareable meeting room code? Enter the token below to connect immediately to your session.
                </p>
              </div>

              {roomAction !== "join" ? (
                <button 
                  onClick={() => setRoomAction("join")}
                  className="btn-secondary w-full mt-4 border-teal-500/20 hover:border-teal-500/50"
                >
                  Join Room Code <FiClipboard />
                </button>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-2 mt-4">
                  <input 
                    type="text" 
                    placeholder="meet-XXXX-XXXX"
                    value={activeJoinCode}
                    onChange={(e) => setActiveJoinCode(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-navy-900 px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-teal-500 outline-none"
                  />
                  {joinError && <p className="text-[10px] text-rose-400 font-semibold">{joinError}</p>}
                  {joinSuccess && <p className="text-[10px] text-emerald-400 font-semibold">{joinSuccess}</p>}
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      className="btn-primary w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-xs py-2 h-9"
                    >
                      Connect
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setRoomAction(null);
                        setActiveJoinCode("");
                        setJoinError("");
                        setJoinSuccess("");
                      }}
                      className="btn-secondary text-xs py-2 px-3 h-9"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </motion.div>

          </div>

          {/* More options section */}
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
            className="rounded-xl border border-white/5 bg-white/5 p-5"
          >
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><FiZap className="text-indigo-400" /> More Practice Tracks Coming Soon</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-navy-950/60 rounded-lg text-center border border-white/5">
                <span className="block text-xs font-semibold text-gray-300">Resume Grader</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Waitlist</span>
              </div>
              <div className="p-3 bg-navy-950/60 rounded-lg text-center border border-white/5">
                <span className="block text-xs font-semibold text-gray-300">System Design</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Waitlist</span>
              </div>
              <div className="p-3 bg-navy-950/60 rounded-lg text-center border border-white/5">
                <span className="block text-xs font-semibold text-gray-300">SQL Sandboxes</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Waitlist</span>
              </div>
              <div className="p-3 bg-navy-950/60 rounded-lg text-center border border-white/5">
                <span className="block text-xs font-semibold text-gray-300">Behavioral Bank</span>
                <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Waitlist</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Stats & Activity */}
        <div className="space-y-6">
          {/* Quick Metrics — Real Data */}
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
            className="glass-card p-6 space-y-4"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <FiActivity className="text-indigo-400" /> Preparation Stats
            </h3>
            
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : stats?.totalSessions > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-gray-400">Total Sessions</span>
                  <span className="text-sm font-bold text-white">{stats.totalSessions}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-gray-400">Avg Technical</span>
                  <span className={`text-sm font-bold ${stats.avgTechnicalScore >= 70 ? "text-emerald-400" : stats.avgTechnicalScore >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                    {stats.avgTechnicalScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-gray-400">Avg Communication</span>
                  <span className={`text-sm font-bold ${stats.avgCommunicationScore >= 70 ? "text-emerald-400" : stats.avgCommunicationScore >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                    {stats.avgCommunicationScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Avg Problem Solving</span>
                  <span className={`text-sm font-bold ${stats.avgProblemSolvingScore >= 70 ? "text-emerald-400" : stats.avgProblemSolvingScore >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                    {stats.avgProblemSolvingScore}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-3">
                  <FiTrendingUp className="text-xl" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No sessions yet</p>
                <p className="text-[10px] text-gray-500 mt-1">Complete your first AI mock to see stats here</p>
              </div>
            )}
          </motion.div>

          {/* Recent Activity — Real Data */}
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
            className="glass-card p-6 space-y-4"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <FiCalendar className="text-cyan-400" /> Recent Activity
            </h3>

            {recentSessions.length > 0 ? (
              <div className="space-y-3.5">
                {recentSessions.slice(0, 5).map((session, i) => {
                  const score = getOverallScore(session);
                  return (
                    <div key={session._id || i} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                        <FiCpu className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-gray-200 truncate">
                          AI Mock: {session.userId?.targetRole || "Interview"}
                        </h5>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <FiClock /> {formatDate(session.createdAt)} • {session.userId?.experienceLevel || ""}
                        </p>
                        <p className={`text-[10px] font-bold mt-1 ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                          Score: {score}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-3">
                  <FiCalendar className="text-xl" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No activity yet</p>
                <p className="text-[10px] text-gray-500 mt-1">Your completed sessions will appear here</p>
              </div>
            )}
          </motion.div>
          
        </div>

      </div>

    </div>
  );
}
