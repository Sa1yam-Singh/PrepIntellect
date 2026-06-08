import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FiUser, FiMail, FiBriefcase, FiAward, FiCode, FiActivity, 
  FiCalendar, FiClock, FiCheckCircle, FiChevronRight, FiLogOut, FiTrendingUp 
} from "react-icons/fi";

export default function ProfilePage({ user, onLogout, onViewReport }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch user sessions and stats
  useEffect(() => {
    async function fetchProfileData() {
      if (!user?.email) return;
      try {
        const emailEncoded = encodeURIComponent(user.email);
        const [sessionsRes, statsRes] = await Promise.all([
          axios.get(`/api/sessions/user/${emailEncoded}`),
          axios.get(`/api/stats/${emailEncoded}`)
        ]);
        setSessions(sessionsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to load profile details", err);
      } finally {
        setLoading(false);
        setLoadingStats(false);
      }
    }
    fetchProfileData();
  }, [user?.email]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getOverallScore = (session) => {
    const e = session.finalEvaluation;
    if (!e) return 0;
    return Math.round(((e.technicalScore || 0) + (e.communicationScore || 0) + (e.problemSolvingScore || 0)) / 3);
  };

  const getOverallGrade = (score) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    return "D";
  };

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gradient">
            My Account & Profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View your registration details, company/organization, and completed interview history.
          </p>
        </div>
        <button 
          onClick={onLogout} 
          className="btn-danger py-2.5 px-5 text-sm flex items-center gap-2"
        >
          <FiLogOut className="text-base" />
          Sign Out
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card-strong p-6 relative overflow-hidden"
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-indigo-500/5 blur-[30px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-[25px] pointer-events-none" />

            <div className="flex flex-col items-center text-center pb-6 border-b border-white/5 relative z-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 text-white font-extrabold text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-4">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <p className="text-xs text-indigo-300 font-mono mt-1">{user.organization || "Personal"}</p>
            </div>

            <div className="pt-6 space-y-4 text-sm relative z-10">
              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400">
                  <FiMail />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Email Address</span>
                  <span className="text-gray-200 text-xs truncate block">{user.email}</span>
                </div>
              </div>

              {/* Company / Organization */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400">
                  <FiBriefcase className="text-indigo-400" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Company / Org</span>
                  <span className="text-gray-200 text-xs font-semibold">{user.organization || "Personal / Independent"}</span>
                </div>
              </div>

              {/* Target Role */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400">
                  <FiAward className="text-purple-400" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Target Role</span>
                  <span className="text-gray-200 text-xs font-semibold">{user.targetRole || "Software Engineer"}</span>
                </div>
              </div>

              {/* Experience Level */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400">
                  <FiActivity className="text-cyan-400" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Experience Tier</span>
                  <span className="text-gray-200 text-xs font-semibold">{user.experienceLevel || "Mid-Level"}</span>
                </div>
              </div>

              {/* Key Skills */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 shrink-0 mt-0.5">
                  <FiCode className="text-emerald-400" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Skills Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {user.skillsKeywords && user.skillsKeywords.length > 0 ? (
                      user.skillsKeywords.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-300">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No skills specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right 2 Columns: Interview History List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <FiCalendar className="text-indigo-400" /> Complete Mock Interview History
              </h3>
              <span className="badge-purple">
                {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Syncing history feed...</p>
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-4 overflow-y-auto max-h-[460px] pr-2">
                {sessions.map((session, i) => {
                  const score = getOverallScore(session);
                  const grade = getOverallGrade(score);
                  const isLow = score < 50;
                  const isMed = score >= 50 && score < 70;
                  const isHigh = score >= 70;
                  
                  return (
                    <motion.div
                      key={session._id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/5 bg-navy-950/40 p-4 hover:border-indigo-500/35 hover:bg-white/5 transition group"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mt-0.5 group-hover:bg-indigo-500/20 transition">
                          <FiActivity className="text-lg" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-white group-hover:text-indigo-300 transition truncate">
                            {session.userId?.targetRole || "Technical Mock Round"}
                          </h5>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <FiClock /> {formatDate(session.createdAt)} • {session.userId?.experienceLevel || "Mid-Level"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-white/5 pt-3 sm:pt-0">
                        <div className="flex items-center gap-2">
                          {/* Score Badge */}
                          <div className={`text-center px-3 py-1 rounded-lg border ${
                            isHigh ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                            isMed ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" :
                            "bg-rose-500/15 border-rose-500/30 text-rose-400"
                          }`}>
                            <span className="block text-[8px] uppercase font-bold opacity-60">Score</span>
                            <span className="text-sm font-extrabold">{score}%</span>
                          </div>

                          {/* Grade Badge */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-950/60 font-extrabold text-indigo-300 text-sm">
                            {grade}
                          </div>
                        </div>

                        {session.finalEvaluation && (
                          <button
                            onClick={() => onViewReport(session._id, session.finalEvaluation)}
                            className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10"
                          >
                            View Report <FiChevronRight />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4">
                  <FiActivity className="text-3xl" />
                </div>
                <h4 className="text-base font-bold text-white">No Mock Sessions Found</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2">
                  You haven't completed any mock interview loops yet. Start practicing today to build up your scorecard!
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
