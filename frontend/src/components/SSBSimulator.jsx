import { useState, useEffect, useRef } from "react";
import { FiClock, FiShield, FiTrendingUp, FiActivity, FiArrowRight, FiCheck } from "react-icons/fi";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

const WAT_WORDS = [
  "FEAR",
  "COUNTRY",
  "SUCCESS",
  "DISCIPLINE",
  "ANGER",
  "TEAM",
  "LEADER",
  "OBSTACLE",
  "INITIATIVE",
  "COURAGE"
];

const SRT_SITUATIONS = [
  "His team member was not cooperating during a crucial project phase...",
  "He was traveling on a train and noticed a suspicious package under his seat...",
  "During a mountain trek, his team leader broke his leg and there was no cellular network...",
  "He saw a fire breaking out in a neighboring house in the middle of the night...",
  "He noticed his teammate copy-pasting code from unauthorized sources on a client project..."
];

export default function SSBSimulator({ onClose, addToast }) {
  const [step, setStep] = useState("intro"); // intro, wat, srt, tat_observe, tat_write, loading, results
  const [watIndex, setWatIndex] = useState(0);
  const [srtIndex, setSrtIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Answers
  const [watAnswers, setWatAnswers] = useState([]);
  const [srtAnswers, setSrtAnswers] = useState([]);
  const [tatAnswer, setTatAnswer] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  
  // Results
  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState(null);

  const timerRef = useRef(null);

  // General Timer hook
  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimerExpiry();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  const handleTimerExpiry = () => {
    if (step === "wat") {
      // Save current input or empty
      const updated = [...watAnswers, { word: WAT_WORDS[watIndex], answer: currentInput || "(skipped)" }];
      setWatAnswers(updated);
      setCurrentInput("");
      
      if (watIndex < WAT_WORDS.length - 1) {
        setWatIndex(prev => prev + 1);
        setTimeLeft(15);
      } else {
        // Shift to SRT
        addToast("Word Association Test complete! Starting Situation Reaction Test.", "info");
        setStep("srt");
        setSrtIndex(0);
        setTimeLeft(30);
      }
    } else if (step === "srt") {
      const updated = [...srtAnswers, { situation: SRT_SITUATIONS[srtIndex], answer: currentInput || "(skipped)" }];
      setSrtAnswers(updated);
      setCurrentInput("");

      if (srtIndex < SRT_SITUATIONS.length - 1) {
        setSrtIndex(prev => prev + 1);
        setTimeLeft(30);
      } else {
        // Shift to TAT Observe
        addToast("Situation Reaction Test complete! Starting Thematic Apperception Test.", "info");
        setStep("tat_observe");
        setTimeLeft(30);
      }
    } else if (step === "tat_observe") {
      setStep("tat_write");
      setTimeLeft(240); // 4 minutes
    } else if (step === "tat_write") {
      handleCompleteSimulator(tatAnswer || "(skipped)");
    }
  };

  const handleManualNext = () => {
    clearTimeout(timerRef.current);
    handleTimerExpiry();
  };

  const handleStart = () => {
    setWatAnswers([]);
    setSrtAnswers([]);
    setTatAnswer("");
    setCurrentInput("");
    setWatIndex(0);
    setSrtIndex(0);
    setStep("wat");
    setTimeLeft(15); // 15 seconds per word
  };

  const handleCompleteSimulator = async (storyText) => {
    setStep("loading");
    setLoading(true);
    addToast("Evaluating psychometric metrics...", "info");

    try {
      const res = await API.post("/ssb/evaluate", {
        watAnswers,
        srtAnswers,
        tatAnswer: storyText
      });
      setEvalData(res.data);
      setStep("results");
    } catch (err) {
      console.error(err);
      addToast("Failed to complete psychometric evaluation.", "error");
      setStep("intro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card-strong p-8 max-w-2xl mx-auto animate-fade-in relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="floating-orb w-[250px] h-[250px] bg-indigo-500/10 top-0 left-0" />
      <div className="floating-orb w-[180px] h-[180px] bg-cyan-500/10 bottom-0 right-0" />

      {/* ── STEP 1: INTRO SCREEN ── */}
      {step === "intro" && (
        <div className="space-y-6 text-center py-6 relative z-10">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
            <FiShield className="text-3xl" />
          </div>
          
          <div className="space-y-2">
            <span className="badge-purple">Timed Defense Suite</span>
            <h3 className="text-2xl font-black text-white">SSB Timed Psychometric Simulator</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Experience the standard Officer Intelligence and Psychological tests used in Services Selection Boards (SSB). Evaluates 15 Officer Like Qualities (OLQs).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 max-w-lg mx-auto">
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase block">1. WAT</span>
              <span className="text-xs text-white font-semibold">10 Words</span>
              <span className="text-[9px] text-gray-500 block">15s per word</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase block">2. SRT</span>
              <span className="text-xs text-white font-semibold">5 Situations</span>
              <span className="text-[9px] text-gray-500 block">30s per scenario</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase block">3. TAT</span>
              <span className="text-xs text-white font-semibold">1 Sketch</span>
              <span className="text-[9px] text-gray-500 block">4.5m total time</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <button onClick={onClose} className="btn-secondary px-6 text-xs font-bold">
              Cancel
            </button>
            <button onClick={handleStart} className="btn-primary px-8 text-xs font-bold">
              Start Simulator
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: WAT SCREEN ── */}
      {step === "wat" && (
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <FiShield /> Word Association Test
            </span>
            <span className="text-xs text-gray-500 font-bold">Word {watIndex + 1} of {WAT_WORDS.length}</span>
          </div>

          {/* Word Display & Timer */}
          <div className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="h-20 w-20 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" className="stroke-indigo-500" strokeWidth="4" fill="transparent" strokeDasharray={2*Math.PI*36} strokeDashoffset={2*Math.PI*36 - (timeLeft/15)*(2*Math.PI*36)} />
              </svg>
              <span className="text-lg font-black text-white">{timeLeft}s</span>
            </div>
            
            <h1 className="text-5xl font-black tracking-widest text-gradient">{WAT_WORDS[watIndex]}</h1>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your first association sentence..."
              className="auth-input text-center h-14"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleManualNext()}
            />
            <div className="flex justify-between items-center text-[10px] text-gray-500">
              <span>Press enter or click next to proceed.</span>
              <button onClick={handleManualNext} className="text-indigo-400 font-bold hover:underline">
                Next Word
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SRT SCREEN ── */}
      {step === "srt" && (
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <FiShield /> Situation Reaction Test
            </span>
            <span className="text-xs text-gray-500 font-bold">Situation {srtIndex + 1} of {SRT_SITUATIONS.length}</span>
          </div>

          <div className="space-y-6 py-6 text-center">
            <div className="flex justify-center">
              <div className="h-10 w-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-white font-bold text-sm">
                <FiClock className="text-indigo-400" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-sm font-semibold text-gray-200 leading-relaxed">
                {SRT_SITUATIONS[srtIndex]}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Write your immediate reaction..."
              className="auth-input h-24 resize-none"
              autoFocus
            />
            <div className="flex justify-between items-center text-[10px] text-gray-500">
              <span>Auto-submits on timer expiry.</span>
              <button onClick={handleManualNext} className="text-indigo-400 font-bold hover:underline">
                Next Situation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: TAT OBSERVATION SCREEN ── */}
      {step === "tat_observe" && (
        <div className="space-y-6 relative z-10 text-center">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 text-left">
            <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <FiShield /> TAT — Sketch Observation
            </span>
            <span className="text-xs text-gray-500 font-bold">{timeLeft}s remaining</span>
          </div>

          <div className="py-4 space-y-4">
            <p className="text-xs text-gray-400">Observe the sketch outline below. Think about what led to the situation, what is happening now, and what the outcome will be.</p>
            
            {/* Outline Sketch Frame */}
            <div className="mx-auto w-[360px] h-[240px] bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-noise opacity-5" />
              <div className="border border-indigo-500/20 bg-indigo-500/5 px-6 py-4 rounded-xl max-w-[280px]">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block mb-2">SCENE SKETCH</span>
                <p className="text-xs text-gray-300 font-semibold leading-relaxed">
                  A young officer standing on a wind-swept concrete dam, looking down towards a flooded valley where local villagers are assembling wooden rafts.
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleManualNext} className="btn-primary px-6 py-2.5 text-xs">
            Start Writing Now
          </button>
        </div>
      )}

      {/* ── STEP 5: TAT WRITING SCREEN ── */}
      {step === "tat_write" && (
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <FiShield /> TAT — Write Story
            </span>
            <span className="text-xs text-gray-500 font-bold">
              Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Write a story (approx. 100-150 words) depicting the scenario, character's thoughts, details of actions taken, and final outcome.
            </p>
            
            <textarea
              value={tatAnswer}
              onChange={(e) => setTatAnswer(e.target.value)}
              placeholder="Start writing your story here..."
              className="auth-input h-52 resize-none leading-relaxed"
              autoFocus
            />

            <button
              onClick={() => handleCompleteSimulator(tatAnswer)}
              className="btn-primary w-full py-3 text-xs"
            >
              Submit Simulator Responses
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: LOADING SCREEN ── */}
      {step === "loading" && (
        <div className="space-y-6 text-center py-12 relative z-10">
          <div className="h-16 w-16 mx-auto rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center" />
          <div className="space-y-2 animate-pulse">
            <h3 className="text-lg font-bold text-white">SSB Psychometric Evaluation in Progress...</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">Evaluating word associations, stress reactivity patterns, and story theme alignments against the 15 Officer Like Qualities.</p>
          </div>
        </div>
      )}

      {/* ── STEP 7: RESULTS SCREEN ── */}
      {step === "results" && evalData && (
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
              <FiTrendingUp /> Psychometric Evaluation Report
            </span>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-white font-bold">
              Done
            </button>
          </div>

          {/* Score Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 glass-card bg-indigo-950/20 border-indigo-500/10">
            <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="38" className="stroke-white/5" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-indigo-400 transition-all duration-1000"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2*Math.PI*38}
                  strokeDashoffset={2*Math.PI*38 - (evalData.score/100)*(2*Math.PI*38)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{evalData.score}%</span>
              </div>
            </div>

            <div className="space-y-1.5 flex-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white">SSB Fitment & Officer potential Rating</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your responses demonstrate a solid alignment with core defense leadership values. Detail ratings across key factors are detailed below.
              </p>
            </div>
          </div>

          {/* OLQ breakdown */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FiActivity className="text-indigo-400" />
              OLQ Factor breakdown
            </h4>
            
            <div className="grid gap-3.5 sm:grid-cols-2">
              {[
                { label: "Effective Intelligence", key: "effectiveIntelligence" },
                { label: "Social Adaptability", key: "socialAdaptability" },
                { label: "Liveliness", key: "liveliness" },
                { label: "Courage & Grit", key: "courage" },
                { label: "Cooperation & Teamwork", key: "cooperation" }
              ].map((olq, i) => {
                const score = evalData.olqScores?.[olq.key] || 5;
                return (
                  <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-300">{olq.label}</span>
                      <span className="text-indigo-400 font-extrabold">{score}/10</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${score * 10}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="glass-card p-5 space-y-4">
            <div>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">Psychologist's Writeup</span>
              <p className="text-xs text-gray-300 leading-relaxed mt-2">{evalData.detailedFeedback}</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Positive Indicators</span>
                <ul className="space-y-1.5 mt-2">
                  {evalData.strengths?.map((str, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-emerald-400 select-none">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block">Growth Areas</span>
                <ul className="space-y-1.5 mt-2">
                  {evalData.weaknesses?.map((weak, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-yellow-400 select-none">•</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="btn-primary w-full py-3 text-xs">
            Return to Dashboard
          </button>
        </div>
      )}

    </div>
  );
}
