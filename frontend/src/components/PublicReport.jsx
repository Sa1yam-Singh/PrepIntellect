import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { FiCpu, FiClock, FiActivity, FiAward, FiAlertCircle } from "react-icons/fi";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

function ScoreRing({ score, label, color }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-100">{score}</span>
          <span className="text-[9px] text-gray-500 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-300">{label}</span>
    </div>
  );
}

export default function PublicReport({ sessionId }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPublicSession() {
      try {
        const res = await API.get(`/sessions/public/${sessionId}`);
        setSession(res.data);
      } catch (err) {
        console.error(err);
        setError("Report not found, or it has been set to private.");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) fetchPublicSession();
  }, [sessionId]);

  const evaluation = session?.finalEvaluation;

  const radarData = useMemo(() => {
    if (!evaluation) return [];
    return [
      { metric: "Technical", score: evaluation.technicalScore || 0 },
      { metric: "Communication", score: evaluation.communicationScore || 0 },
      { metric: "Problem Solving", score: evaluation.problemSolvingScore || 0 },
      { metric: "Clarity", score: Math.max(0, (evaluation.communicationScore || 0) - (evaluation.grammarIssues?.length || 0) * 5) },
      { metric: "Depth", score: Math.min(100, (evaluation.technicalScore || 0) + (evaluation.strengths?.length || 0) * 3) },
    ];
  }, [evaluation]);

  const durationData = useMemo(() => {
    if (!session?.chatHistory) return [];
    return session.chatHistory.map((entry, i) => ({
      name: `Q${i + 1}`,
      duration: entry.durationSeconds || 0,
    }));
  }, [session]);

  const overallScore = useMemo(() => {
    if (!evaluation) return 0;
    return Math.round(
      ((evaluation.technicalScore || 0) + (evaluation.communicationScore || 0) + (evaluation.problemSolvingScore || 0)) / 3
    );
  }, [evaluation]);

  const overallGrade = useMemo(() => {
    if (overallScore >= 90) return "A+";
    if (overallScore >= 80) return "A";
    if (overallScore >= 70) return "B+";
    if (overallScore >= 60) return "B";
    if (overallScore >= 50) return "C";
    return "D";
  }, [overallScore]);

  const getAudioUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    const cleanBackendUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBackendUrl}${cleanUrl}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-400">Loading shared interview analytics report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center rounded-2xl mx-auto text-3xl">
          <FiAlertCircle />
        </div>
        <h3 className="text-xl font-bold text-white">Access Denied</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
        <a href="/" className="btn-primary py-2.5 px-4 text-xs font-semibold inline-block">Return to Homepage</a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 animate-fade-in text-left">
      
      {/* Header banner */}
      <div className="border-b border-white/5 pb-4">
        <span className="badge-purple mb-2">Public Shared Report</span>
        <h2 className="text-2xl font-bold text-white leading-tight">
          AI Interview Evaluation Review
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Candidate: <span className="text-gray-300 font-semibold">{session.userId?.name}</span> • Role Target: <span className="text-indigo-300 font-semibold">{session.userId?.targetRole}</span> ({session.userId?.experienceLevel})
        </p>
      </div>

      {/* Ring scores */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-br from-indigo-950/20 via-navy-950 to-navy-950">
        <div className="flex flex-wrap justify-around items-center gap-6">
          <ScoreRing score={evaluation?.technicalScore || 0} label="Technical" color="#6366f1" />
          <ScoreRing score={evaluation?.communicationScore || 0} label="Communication" color="#06b6d4" />
          <ScoreRing score={evaluation?.problemSolvingScore || 0} label="Problem Solving" color="#8b5cf6" />
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-24 w-24 rounded-full border-4 border-indigo-500/20 bg-indigo-500/5 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gradient">{overallGrade}</span>
              <span className="text-[10px] text-gray-500 font-bold">{overallScore}%</span>
            </div>
            <span className="text-xs font-semibold text-gray-300">Overall Grade</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Performance Radar</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Response Duration (seconds)</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} barCategoryGap="25%">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 8 }} />
                <Bar dataKey="duration" name="Duration" radius={[4, 4, 0, 0]}>
                  {durationData.map((_, i) => (
                    <Cell key={i} fill={["#6366f1", "#8b5cf6", "#06b6d4", "#14b8a6"][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths & Improvement Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4 border-emerald-500/10 bg-emerald-500/5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            ✓ Key Strengths
          </h4>
          <ul className="space-y-2.5">
            {evaluation?.strengths?.map((s, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✦</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-5 space-y-4 border-yellow-500/10 bg-yellow-500/5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            △ Improvement Areas
          </h4>
          <ul className="space-y-2.5">
            {evaluation?.weaknesses?.map((w, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-yellow-400 font-bold shrink-0">△</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Tips */}
      {evaluation?.improvementTips?.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Actionable Advice</h4>
          <div className="grid sm:grid-cols-3 gap-4">
            {evaluation.improvementTips.map((tip, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5 bg-navy-950/40 text-xs text-gray-300 space-y-1">
                <span className="font-bold text-indigo-300">{i + 1}. Step</span>
                <p className="leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full QA Transcript review */}
      <div className="glass-card p-6 space-y-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/5 pb-3">
          Question-by-Question Transcript Review
        </h4>
        <div className="space-y-6">
          {session.chatHistory?.map((q, idx) => (
            <div key={idx} className="p-5 rounded-xl border border-white/5 bg-navy-950/40 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
                <span>Question {idx + 1}</span>
                {q.durationSeconds > 0 && <span>Duration: {q.durationSeconds}s</span>}
              </div>
              <p className="text-sm font-semibold text-gray-200">{q.question}</p>
              <div className="border-t border-white/5 pt-3 space-y-3 text-xs">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Answer Response</span>
                  <p className="text-gray-300 italic bg-white/5 rounded-lg p-3 border border-white/5">
                    "{q.transcribedAnswer || "No response transcribed."}"
                  </p>
                </div>
                {q.aiReaction && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-indigo-400 mb-1">AI Reaction</span>
                    <p className="text-gray-300">{q.aiReaction}</p>
                  </div>
                )}
                {evaluation?.perQuestionFeedback?.[idx] && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-cyan-400 mb-1">Interviewer Feedback</span>
                    <p className="text-gray-300">{evaluation.perQuestionFeedback[idx]}</p>
                  </div>
                )}
                {q.audioUrl && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Audio Recording</span>
                    <audio src={getAudioUrl(q.audioUrl)} controls className="h-8 max-w-sm w-full mt-1.5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
