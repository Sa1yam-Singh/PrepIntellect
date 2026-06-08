import { useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/*
 * ═══════════════════════════════════════════════════════════════════
 * AnalyticsDashboard — Post-interview evaluation & analytics
 * ═══════════════════════════════════════════════════════════════════
 * All data is REAL — fetched from the database, zero fakes.
 */

// ── Custom Recharts Tooltip ─────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-indigo-500/10 bg-navy-950/95 px-4 py-3 shadow-glow backdrop-blur-sm">
      <p className="text-xs font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Animated Score Ring ──────────────────────────────────────────
function ScoreRing({ score, label, color }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? offset : circumference}
            className="transition-all duration-[1500ms] ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedCounter target={score} />
          <span className="text-xs text-gray-500 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-300">{label}</span>
    </motion.div>
  );
}

// ── Animated Counter ────────────────────────────────────────────
function AnimatedCounter({ target }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);

  return <span className="text-3xl font-bold text-gray-100 score-counter">{value}</span>;
}

export default function AnalyticsDashboard({ sessionId, evaluation, onRestart }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await axios.get(`/api/sessions/${sessionId}`);
        setSession(res.data);
      } catch (err) {
        console.error("Failed to load session details", err);
      }
    }
    if (sessionId) fetchSession();
  }, [sessionId]);

  // ── Derived data — REAL ──────────────────────────────────────────
  const radarData = useMemo(
    () => [
      { metric: "Technical", score: evaluation?.technicalScore || 0 },
      { metric: "Communication", score: evaluation?.communicationScore || 0 },
      { metric: "Problem Solving", score: evaluation?.problemSolvingScore || 0 },
      {
        metric: "Clarity",
        score: Math.max(0, (evaluation?.communicationScore || 0) - (evaluation?.grammarIssues?.length || 0) * 5),
      },
      {
        metric: "Depth",
        score: Math.min(100, (evaluation?.technicalScore || 0) + (evaluation?.strengths?.length || 0) * 3),
      },
    ],
    [evaluation]
  );

  // ── REAL duration data from session chat history ──────────────────
  const durationData = useMemo(() => {
    if (!session?.chatHistory) return [];
    return session.chatHistory.map((entry, i) => ({
      name: `Q${i + 1}`,
      duration: entry.durationSeconds || 0,
    }));
  }, [session]);

  const barColors = ["#6366f1", "#8b5cf6", "#06b6d4", "#14b8a6"];

  const overallScore = Math.round(
    ((evaluation?.technicalScore || 0) + (evaluation?.communicationScore || 0) + (evaluation?.problemSolvingScore || 0)) / 3
  );
  const overallGrade =
    overallScore >= 90 ? "A+" :
    overallScore >= 80 ? "A" :
    overallScore >= 70 ? "B+" :
    overallScore >= 60 ? "B" :
    overallScore >= 50 ? "C" : "D";

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gradient">
            Interview Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Session <span className="font-mono text-gray-400">{sessionId?.slice(-8)}</span> — Evaluation Complete
          </p>
        </div>
        <button onClick={onRestart} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Start New Interview
        </button>
      </div>

      {/* ── Score Rings Row ─────────────────────────────────────── */}
      <div className="glass-card-strong p-8">
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
          <ScoreRing score={evaluation?.technicalScore || 0} label="Technical" color="#6366f1" />
          <ScoreRing score={evaluation?.communicationScore || 0} label="Communication" color="#06b6d4" />
          <ScoreRing score={evaluation?.problemSolvingScore || 0} label="Problem Solving" color="#8b5cf6" />
          {/* Overall */}
          <motion.div 
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 border-indigo-500/30 bg-navy-950/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <span className="text-4xl font-extrabold text-gradient">{overallGrade}</span>
              <span className="text-xs text-gray-500 font-semibold">{overallScore}%</span>
            </div>
            <span className="text-sm font-semibold text-gray-300">Overall Grade</span>
          </motion.div>
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar Chart */}
        <motion.div 
          className="glass-card p-6"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="mb-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Performance Radar
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Duration Bar Chart — REAL DATA */}
        <motion.div 
          className="glass-card p-6"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="mb-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Response Duration (seconds)
          </h3>
          {durationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={durationData} barCategoryGap="25%">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="duration" name="Duration" radius={[6, 6, 0, 0]}>
                  {durationData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-500">Loading session data...</div>
          )}
        </motion.div>
      </div>

      {/* ── Strengths & Weaknesses ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Strengths */}
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Strengths</h3>
          </div>
          <ul className="space-y-3">
            {(evaluation?.strengths || []).map((s, i) => (
              <motion.li key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3 text-sm text-gray-300"
              >
                <span className="mt-0.5 text-emerald-400">✦</span> {s}
              </motion.li>
            ))}
            {(!evaluation?.strengths || evaluation.strengths.length === 0) && (
              <li className="text-sm text-gray-500 italic">No strengths identified.</li>
            )}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warn-500/15">
              <svg className="h-4 w-4 text-warn-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-warn-400 uppercase tracking-wider">Areas for Improvement</h3>
          </div>
          <ul className="space-y-3">
            {(evaluation?.weaknesses || []).map((w, i) => (
              <motion.li key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-warn-500/10 bg-warn-500/5 p-3 text-sm text-gray-300"
              >
                <span className="mt-0.5 text-warn-400">△</span> {w}
              </motion.li>
            ))}
            {(!evaluation?.weaknesses || evaluation.weaknesses.length === 0) && (
              <li className="text-sm text-gray-500 italic">No weaknesses identified.</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Improvement Tips ──────────────────────────────────── */}
      {evaluation?.improvementTips?.length > 0 && (
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Actionable Improvement Tips</h3>
          </div>
          <div className="space-y-2">
            {evaluation.improvementTips.map((tip, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3 text-sm text-gray-300"
              >
                <span className="text-indigo-400 font-bold">{i + 1}.</span> {tip}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-Question Review with AI Reactions ────────────── */}
      {session && session.chatHistory?.length > 0 && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Full Question Review
            </h3>
          </div>
          
          <div className="space-y-6">
            {session.chatHistory.map((q, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15 }}
                className="rounded-xl border border-white/5 bg-navy-950/40 p-5 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="badge-purple">Question {idx + 1}</span>
                  {q.durationSeconds > 0 && (
                    <span className="text-[11px] text-gray-500 font-medium">Duration: {q.durationSeconds}s</span>
                  )}
                </div>
                
                <p className="text-sm text-gray-200 font-medium">{q.question}</p>
                
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Your Response</span>
                    <p className="text-sm text-gray-300 italic bg-white/5 rounded-lg p-3 border border-white/5">
                      "{q.transcribedAnswer || "No answer transcribed"}"
                    </p>
                  </div>

                  {/* AI Reaction */}
                  {q.aiReaction && (
                    <div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-3">
                      <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-1">AI Reaction</span>
                      <p className="text-sm text-gray-300">{q.aiReaction}</p>
                    </div>
                  )}

                  {/* Per-question feedback from evaluation */}
                  {evaluation?.perQuestionFeedback?.[idx] && (
                    <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
                      <span className="block text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1">Evaluation Feedback</span>
                      <p className="text-sm text-gray-300">{evaluation.perQuestionFeedback[idx]}</p>
                    </div>
                  )}
                  
                  {q.audioUrl ? (
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Listen to Recording</span>
                      <audio 
                        src={q.audioUrl} 
                        controls 
                        className="w-full max-w-lg h-9 rounded-lg bg-navy-900 border border-white/10 outline-none accent-indigo-500" 
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-rose-400 italic">No audio recording available</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grammar Issues ─────────────────────────────────────── */}
      {evaluation?.grammarIssues?.length > 0 && (
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Grammar & Language Notes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {evaluation.grammarIssues.map((issue, i) => (
              <span key={i} className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2 text-sm text-gray-300">
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-6 text-center">
        <p className="text-xs text-gray-600">
          PrepIntellect — AI-Powered Mock Interview & Behavioral Analytics Suite
        </p>
      </div>
    </div>
  );
}
