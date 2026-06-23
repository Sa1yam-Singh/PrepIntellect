import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  FiCpu, FiUsers, FiPlusCircle, FiLink, FiVideo, FiTrendingUp, 
  FiCalendar, FiClock, FiActivity, FiArrowRight, FiCheckCircle, FiCopy, FiClipboard, FiZap, FiAward, FiAlertTriangle, FiBookOpen, FiFileText
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

export default function DashboardHub({ user, onStartAIMock, onViewReport, onJoinMeetRoom, navigateToView }) {
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardCategory, setLeaderboardCategory] = useState("All");

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

  // Fetch leaderboard data when category tab changes
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await API.get(`/leaderboard?category=${leaderboardCategory}`);
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err.message);
      }
    }
    fetchLeaderboard();
  }, [leaderboardCategory]);

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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getOverallScore = (session) => {
    const e = session.finalEvaluation;
    if (!e) return 0;
    return Math.round(((e.technicalScore || 0) + (e.communicationScore || 0) + (e.problemSolvingScore || 0)) / 3);
  };

  // ── Stats Calculations ──────────────────────────────────────────
  const statsMetrics = useMemo(() => {
    if (!stats || recentSessions.length === 0) {
      return {
        sessionsThisWeek: 0,
        avgScore: 0,
        streak: 0,
        weakArea: "None"
      };
    }

    // Sessions this week (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessionsThisWeek = recentSessions.filter(
      s => new Date(s.createdAt).getTime() > sevenDaysAgo
    ).length;

    // Overall Average Score
    const totalScore = recentSessions.reduce((sum, s) => sum + getOverallScore(s), 0);
    const avgScore = Math.round(totalScore / recentSessions.length);

    // Weakest Area
    const scores = {
      Technical: stats.avgTechnicalScore || 0,
      Communication: stats.avgCommunicationScore || 0,
      "Problem Solving": stats.avgProblemSolvingScore || 0
    };
    let weakest = "None";
    let minScore = 100;
    Object.entries(scores).forEach(([name, val]) => {
      if (val > 0 && val < minScore) {
        minScore = val;
        weakest = name;
      }
    });

    if (weakest === "None") {
      weakest = "Technical";
    }

    return {
      sessionsThisWeek,
      avgScore,
      streak: stats.currentStreak || 0,
      weakArea: weakest
    };
  }, [stats, recentSessions]);

  // ── 14 Day Line Chart Data ──────────────────────────────────────
  const chartData = useMemo(() => {
    if (recentSessions.length === 0) return [];
    
    // Reverse recent sessions to read left to right chronologically
    return [...recentSessions]
      .reverse()
      .map(s => ({
        date: formatDate(s.createdAt),
        score: getOverallScore(s)
      }));
  }, [recentSessions]);

  // ── Radar Chart Data ──────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!stats) return [];
    return [
      { subject: "Technical", score: stats.avgTechnicalScore || 0, fullMark: 100 },
      { subject: "Communication", score: stats.avgCommunicationScore || 0, fullMark: 100 },
      { subject: "Problem Solving", score: stats.avgProblemSolvingScore || 0, fullMark: 100 },
      { subject: "Structure", score: Math.round((stats.avgCommunicationScore || 0) * 0.9), fullMark: 100 },
      { subject: "Clarity", score: Math.round((stats.avgCommunicationScore || 0) * 1.05), fullMark: 100 },
    ];
  }, [stats]);

  // ── 3 AI Recommendations ────────────────────────────────────────
  const focusAreas = useMemo(() => {
    const area = statsMetrics.weakArea;
    if (area === "Technical") {
      return [
        { title: "Foundations Deep Dive", desc: "Spend 20 mins reviewing data structures & time/space complexity rules." },
        { title: "System Constraints", desc: "Practice scaling databases horizontally using sharding, replication and caching." },
        { title: "Code Clarity", desc: "Explain runtime memory allocation models out loud to build explanation depth." }
      ];
    } else if (area === "Communication") {
      return [
        { title: "STAR Method", desc: "Always structure behavioral stories around Situation, Task, Action and Result." },
        { title: "Filler Word Control", desc: "Pause for 1-2 seconds instead of using verbal filler phrasing like 'uh' or 'like'." },
        { title: "Active Pausing", desc: "Conclude answers with a summarizing wrap-up statement rather than trailing off." }
      ];
    } else {
      return [
        { title: "Edge Case Analysis", desc: "Before proposing algorithms, explicitly walk through empty and overflow constraints." },
        { title: "Methodical Breakdown", desc: "Split large systems into components (Ingestion, DB, Worker) on a notepad first." },
        { title: "Trade-offs Review", desc: "Compare SQL vs NoSQL write performance before selecting a data layer." }
      ];
    }
  }, [statsMetrics.weakArea]);

  return (
    <div className="space-y-8 py-6">
      
      {/* ── Welcome Banner ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 cyber-glow bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-navy-950"
      >
        <div className="floating-orb w-[200px] h-[200px] bg-indigo-500/10 top-1/2 right-10 -translate-y-1/2" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="badge-purple mb-2">PrepIntellect Dashboard</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, <span className="text-gradient">{user.name}</span>!
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Your personalized prep track is ready. Target Role: <span className="text-indigo-300 font-semibold">{user.targetRole || "Software Engineer"}</span> ({user.experienceLevel || "Mid-Level"}).
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onStartAIMock}
              className="btn-primary py-2.5 px-4 text-xs font-bold"
            >
              Start New Mock <FiArrowRight />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 5 Stat Cards Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Metric 1: Total Completed */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-card p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">Total Mocks</span>
          <span className="text-2xl md:text-3xl font-bold text-white block">
            {loadingStats ? "—" : stats?.totalSessions || 0}
          </span>
          <div className="absolute right-4 bottom-4 text-indigo-500/20 text-3xl group-hover:text-indigo-500/30 transition">
            <FiCheckCircle />
          </div>
        </motion.div>

        {/* Metric 2: Avg Score */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-card p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">Avg Score</span>
          <span className="text-2xl md:text-3xl font-bold text-cyan-400 block">
            {loadingStats ? "—" : statsMetrics.avgScore > 0 ? `${statsMetrics.avgScore}%` : "0%"}
          </span>
          <div className="absolute right-4 bottom-4 text-cyan-500/20 text-3xl group-hover:text-cyan-500/30 transition">
            <FiTrendingUp />
          </div>
        </motion.div>

        {/* Metric 3: Streak */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-card p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">Daily Streak</span>
          <span className="text-2xl md:text-3xl font-bold text-purple-400 block">
            {loadingStats ? "—" : `${statsMetrics.streak} Day${statsMetrics.streak !== 1 ? "s" : ""}`}
          </span>
          <div className="absolute right-4 bottom-4 text-purple-500/20 text-3xl group-hover:text-purple-500/30 transition">
            <FiZap />
          </div>
        </motion.div>

        {/* Metric 4: Total XP */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-card p-5 relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-300"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">Total Prep XP</span>
          <span className="text-2xl md:text-3xl font-bold text-yellow-400 block">
            {loadingStats ? "—" : `${stats?.xp || 0} XP`}
          </span>
          <div className="absolute right-4 bottom-4 text-yellow-500/20 text-3xl group-hover:text-yellow-500/30 transition">
            <FiAward />
          </div>
        </motion.div>

        {/* Metric 5: Category Rank */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-card p-5 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300 col-span-2 sm:col-span-1"
        >
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">Category Rank</span>
          <span className="text-2xl md:text-3xl font-bold text-rose-400 block mt-0.5 truncate">
            {loadingStats ? "—" : `#${stats?.rank || 1}`}
          </span>
          <div className="absolute right-4 bottom-4 text-rose-500/20 text-3xl group-hover:text-rose-500/30 transition">
            <FiUsers />
          </div>
        </motion.div>
      </div>

      {/* ── Visual Analytics Section ── */}
      {recentSessions.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* 14 Day Line Chart */}
          <motion.div 
            className="glass-card p-6"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          >
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <FiActivity className="text-indigo-400" /> Score Progression (Last 14 Days)
            </h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "10px" }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" style={{ fontSize: "10px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(5, 8, 22, 0.95)", 
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      fontSize: "12px"
                    }} 
                  />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Radar Chart */}
          <motion.div 
            className="glass-card p-6"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          >
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <FiAward className="text-cyan-400" /> Skill Dimensions breakdown
            </h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} />
                  <Radar name="Performance" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>
      ) : (
        /* Empty State */
        <div className="glass-card p-8 text-center flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-500 mb-4">
            <FiActivity className="text-2xl" />
          </div>
          <h4 className="text-lg font-bold text-white">No analytics history found</h4>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">Complete at least one interview session or upload a resume to unlock detailed progression charts.</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => navigateToView("resume")} className="btn-secondary py-2.5 px-4 text-xs font-semibold">
              <FiFileText /> Upload Resume
            </button>
            <button onClick={onStartAIMock} className="btn-primary py-2.5 px-4 text-xs font-semibold">
              Practice Mock <FiArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* ── Two Column Bottom Grid: Practice Hub & Focus Areas / Activity ── */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Practice Hub & Focus Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-500">Practice Hub</h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {/* AI Mock */}
            <div className="glass-card p-5 hover:border-indigo-500/30 transition duration-300 flex flex-col justify-between group">
              <div>
                <span className="badge-purple mb-3">Rounds Mode</span>
                <h4 className="text-base font-bold text-white mb-1.5">🤖 AI Mock Interview</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">Live voice evaluation with face-tracking guardrails & 15 sequential questions.</p>
              </div>
              <button onClick={onStartAIMock} className="btn-primary w-full py-2.5 text-xs">Launch AI Mock</button>
            </div>

            {/* Resume Upload */}
            <div className="glass-card p-5 hover:border-purple-500/30 transition duration-300 flex flex-col justify-between group">
              <div>
                <span className="badge bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-3">Personalized</span>
                <h4 className="text-base font-bold text-white mb-1.5">📄 Resume Question Builder</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">Upload resume to extract specific skills and generate tailored questions.</p>
              </div>
              <button onClick={() => navigateToView("resume")} className="btn-secondary w-full py-2.5 text-xs">Analyze Resume</button>
            </div>

            {/* Question Bank */}
            <div className="glass-card p-5 hover:border-cyan-500/30 transition duration-300 flex flex-col justify-between group">
              <div>
                <span className="badge bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-3">Browse</span>
                <h4 className="text-base font-bold text-white mb-1.5">📚 Practice Question Bank</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">Explore curated questions by role, target company, difficulty and category.</p>
              </div>
              <button onClick={() => navigateToView("question-bank")} className="btn-secondary w-full py-2.5 text-xs">Browse Bank</button>
            </div>

            {/* Peer Practice Matchmaking */}
            <div className="glass-card p-5 hover:border-teal-500/30 transition duration-300 flex flex-col justify-between group">
              <div>
                <span className="badge bg-teal-500/10 text-teal-300 border border-teal-500/20 mb-3">Co-practice</span>
                <h4 className="text-base font-bold text-white mb-1.5">👥 Match with Peer</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">Practice mock scoring rubrics together in an online video room.</p>
              </div>
              
              {peerState === null && (
                <button onClick={handleMatchPeer} className="btn-secondary w-full py-2.5 text-xs">Match Online</button>
              )}
              {peerState === "matching" && (
                <div className="text-center py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Matching...
                </div>
              )}
              {peerState === "matched" && (
                <button 
                  onClick={() => {
                    const code = "meet-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                    onJoinMeetRoom(code, true);
                    setPeerState(null);
                  }}
                  className="btn-primary w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs"
                >
                  Enter Peer Meet
                </button>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <FiBookOpen className="text-indigo-400" /> AI-Recommended Focus Areas
            </h4>
            <div className="grid sm:grid-cols-3 gap-4">
              {focusAreas.map((focus, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/5 bg-navy-950/40 space-y-1">
                  <span className="text-xs font-bold text-indigo-300">{focus.title}</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{focus.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Recent Sessions History Log */}
        <div className="space-y-6">
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <FiActivity className="text-cyan-400" /> Session History
          </h3>
          
          <div className="glass-card p-6 overflow-hidden">
            {recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.slice(0, 5).map((session, i) => {
                  const score = getOverallScore(session);
                  return (
                    <div key={session._id || i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-gray-200">
                          {session.userId?.targetRole || "Mock Interview"}
                        </h5>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <FiClock /> {formatDate(session.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                          {score}%
                        </span>
                        <button 
                          onClick={() => onViewReport(session._id, session.finalEvaluation)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic text-center py-6">No session activity yet.</p>
            )}
          </div>

          {/* Global Leaderboard Panel */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FiAward className="text-purple-400" /> Global Leaderboard
              </h4>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Rankings</span>
            </div>
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              {["All", "Engineering", "Medical", "Defense", "Aviation"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLeaderboardCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition ${
                    leaderboardCategory === cat
                      ? "bg-purple-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Leaderboard entries */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {leaderboard.length > 0 ? (
                leaderboard.map((leader, index) => {
                  const isMe = leader.email === user?.email;
                  return (
                    <div 
                      key={leader._id || index} 
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        isMe 
                          ? "bg-purple-500/10 border-purple-500/30" 
                          : "bg-white/5 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                          index === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          index === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                          index === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/30" :
                          "bg-white/10 text-gray-400"
                        }`}>
                          {index + 1}
                        </span>
                        <div className="truncate">
                          <h5 className={`text-xs font-bold truncate ${isMe ? "text-purple-300" : "text-gray-200"}`}>
                            {leader.name} {isMe && " (You)"}
                          </h5>
                          <p className="text-[9px] text-gray-500 truncate font-semibold uppercase">{leader.targetRole || leader.category}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-purple-400 font-mono block">{leader.xp || 0} XP</span>
                        <span className="text-[9px] text-gray-500 font-bold block">⚡ {leader.streak || 0}d streak</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] text-gray-500 italic text-center py-4">No competitors active yet.</p>
              )}
            </div>
          </div>

          {/* Quick Meet Join panel */}
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FiVideo className="text-cyan-400" /> Live Peer Meetups
            </h4>
            {roomAction !== "join" ? (
              <div className="flex flex-col gap-2">
                <button onClick={handleCreateRoom} className="btn-secondary w-full py-2.5 text-xs">Create Meet Link</button>
                <button onClick={() => setRoomAction("join")} className="btn-ghost text-xs">Join Room with Code</button>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-2">
                <input 
                  type="text" 
                  placeholder="meet-XXXX-XXXX"
                  value={activeJoinCode}
                  onChange={(e) => setActiveJoinCode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-navy-900 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none"
                />
                {joinError && <p className="text-[10px] text-rose-400 font-semibold">{joinError}</p>}
                {joinSuccess && <p className="text-[10px] text-emerald-400 font-semibold">{joinSuccess}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary w-full text-[10px] py-1.5">Connect</button>
                  <button type="button" onClick={() => setRoomAction(null)} className="btn-secondary w-full text-[10px] py-1.5">Cancel</button>
                </div>
              </form>
            )}
            {roomAction === "create" && createdRoomCode && (
              <div className="rounded-xl bg-navy-900 border border-white/10 p-2.5 text-xs flex justify-between items-center mt-3">
                <span className="font-mono text-cyan-400 truncate max-w-[170px]">{createdRoomCode}</span>
                <button onClick={handleCopyCode} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded">
                  {copied ? <FiCheckCircle className="text-emerald-400" /> : <FiCopy />}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
