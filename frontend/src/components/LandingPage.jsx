import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiCpu, FiUsers, FiBarChart2, FiVideo, FiTrendingUp, FiShield, 
  FiCheckCircle, FiStar, FiChevronLeft, FiChevronRight, FiMic, 
  FiUploadCloud, FiZap, FiBookOpen, FiArrowRight, FiPlay 
} from "react-icons/fi";

// Animated Mock Interview Widget
function AnimatedHeroWidget() {
  const [step, setStep] = useState(1);
  const [typedQuestion, setTypedQuestion] = useState("");
  const questionText = "Tell me about a time you had to lead a team through a difficult technical challenge.";

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => {
        const next = prev === 4 ? 1 : prev + 1;
        if (next === 1) setTypedQuestion("");
        return next;
      });
    }, 4500); // 4.5 seconds per step

    return () => clearInterval(interval);
  }, []);

  // Typewriter effect for Step 1
  useEffect(() => {
    if (step !== 1) return;
    let index = 0;
    const typingInterval = setInterval(() => {
      setTypedQuestion(questionText.slice(0, index));
      index++;
      if (index > questionText.length) {
        clearInterval(typingInterval);
      }
    }, 25);
    return () => clearInterval(typingInterval);
  }, [step]);

  return (
    <div className="glass-card-strong p-6 text-left relative overflow-hidden h-[380px] w-full max-w-[480px] mx-auto shadow-2xl border border-white/10 rounded-2xl flex flex-col justify-between bg-navy-950/90 backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Live Session Sandbox</span>
      </div>

      {/* Widget main body */}
      <div className="flex-grow py-4 flex flex-col justify-center gap-4">
        {/* Step 1: Question typing */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider font-mono block">AI Interviewer:</span>
          <p className="text-sm font-semibold text-white leading-relaxed min-h-[48px]">
            {step === 1 ? typedQuestion : questionText}
            {step === 1 && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />}
          </p>
        </div>

        {/* Step 2: Voice Answering Waveform */}
        {step >= 2 && (
          <div className="space-y-1.5 animate-fade-in">
            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider font-mono block">Candidate Answering (Voice):</span>
            {step === 2 ? (
              <div className="flex items-center gap-1.5 h-8 bg-white/5 rounded-lg px-3 border border-white/5">
                <span className="recording-dot shrink-0" />
                <div className="flex items-center gap-1 flex-grow justify-center">
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-3" />
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-5" style={{animationDelay: '0.1s'}} />
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-2" style={{animationDelay: '0.2s'}} />
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-4" style={{animationDelay: '0.3s'}} />
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-6" style={{animationDelay: '0.4s'}} />
                  <span className="w-1 bg-purple-500 rounded animate-pulse h-1" style={{animationDelay: '0.5s'}} />
                </div>
                <span className="text-[8px] font-mono text-gray-500">00:08</span>
              </div>
            ) : (
              <p className="text-xs text-gray-300 italic line-clamp-2 bg-white/5 p-2.5 rounded-lg border border-white/5 font-mono leading-relaxed">
                "I led a migration of a legacy billing system to a serverless model. The biggest challenge was data integrity..."
              </p>
            )}
          </div>
        )}

        {/* Step 3: Rubric Score panels */}
        {step >= 3 && (
          <div className="space-y-2 animate-slide-up">
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider font-mono block">Rubric Score Evaluation:</span>
            <div className="space-y-1.5 text-[10px]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Structure (STAR Format)</span>
                  <span className="font-bold text-emerald-400">8/10</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: step >= 3 ? '80%' : '0%' }} />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Specificity & Action Metrics</span>
                  <span className="font-bold text-amber-400">6/10</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: step >= 3 ? '60%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Final Feedback tag */}
      <div className="min-h-[48px] flex items-center border-t border-white/5 pt-2">
        {step === 4 && (
          <div className="w-full flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 animate-scale-in">
            <span className="text-[10px] text-indigo-300 font-bold font-mono">AI Coach:</span>
            <span className="text-[10px] text-gray-200 font-medium flex-grow text-right truncate pl-2">Nice structure! Add quantitative billing metrics to raise impact scores.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Count Up Sub-component
function CountUp({ end, duration = 1500, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage({ onGetStarted, openAuthModal }) {
  // Testimonials Slider
  const testimonials = [
    {
      quote: "PrepIntellect helped me identify three major communication flaws in my system design answers. The per-question AI feedback was incredibly helpful. Landed my Senior role at Stripe!",
      author: "Elena R.",
      role: "Senior Software Engineer",
      stars: 5
    },
    {
      quote: "The real-time camera tracking and terminal feed forced me to stop looking away. The behavioral guardrails made the mock feel just like a real high-stakes exam.",
      author: "Marcus K.",
      role: "L5 Engineer at Google",
      stars: 5
    },
    {
      quote: "The Text-to-Speech voices and prompt customization made me feel like I was speaking to a real recruiter. Highly recommend using it before any tech loop.",
      author: "Priya S.",
      role: "Fullstack Developer",
      stars: 5
    }
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handlePrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  // Marquee list of logos
  const logos = ["Google", "Meta", "Stripe", "McKinsey", "Netflix", "Amazon", "Microsoft", "Apple", "Uber", "Airbnb"];

  return (
    <div className="space-y-24 py-12 md:py-20 relative overflow-hidden">
      
      {/* ── BACKGROUND ORBS ──────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="floating-orb w-[350px] h-[350px] bg-indigo-500/10 top-1/4 left-10" />
        <div className="floating-orb w-[220px] h-[220px] bg-purple-500/8 top-1/2 right-10" style={{ animationDelay: "2s" }} />
        <div className="floating-orb w-[280px] h-[280px] bg-cyan-500/6 bottom-1/4 left-1/3" style={{ animationDelay: "4s" }} />
      </div>

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 z-10 grid md:grid-cols-12 gap-12 items-center">
        
        {/* Left Column Text & CTAs */}
        <div className="md:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-sm">
            <FiCpu className="text-sm animate-pulse" /> AI-Powered Interview Prep
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Practice until you're <span className="text-gradient-moving">unshakeable.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed max-w-xl">
            Adaptive AI questioning, live answer scoring, and behavioral analytics built for the way real interviews work.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button 
              onClick={onGetStarted}
              className="btn-primary w-full sm:w-auto px-8 py-4 text-base"
            >
              Start practicing free <FiArrowRight className="ml-1" />
            </button>
            
            <a 
              href="#interactive-demo"
              className="btn-secondary w-full sm:w-auto px-8 py-4 text-base flex items-center justify-center gap-2"
            >
              <FiPlay className="text-indigo-400" /> Watch a demo
            </a>
          </div>

          <p className="text-xs text-gray-500 font-semibold tracking-wide pt-2">
            No credit card. Cancel anytime. <CountUp end={500} suffix="+" /> mock sessions completed this week.
          </p>
        </div>

        {/* Right Column: Animated Interview Widget */}
        <div className="md:col-span-5 flex justify-center">
          <AnimatedHeroWidget />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP (SCROLLING TICKER) ────────────────── */}
      <section className="relative border-y border-white/5 py-8 bg-navy-950/20 backdrop-blur-sm z-10 overflow-hidden w-full">
        <div className="mx-auto max-w-7xl px-6 mb-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Trusted by candidates who got hired at</p>
        </div>
        
        {/* Infinite Ticker Container */}
        <div className="flex select-none overflow-hidden relative w-full mt-4">
          <motion.div 
            className="flex gap-20 whitespace-nowrap min-w-full justify-around pr-20"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 25, repeat: Infinity }}
          >
            {/* First Set of Logos */}
            {logos.concat(logos).map((logo, index) => (
              <span key={index} className="text-lg font-bold tracking-wider text-gray-600 hover:text-indigo-400/50 transition duration-300 font-heading">
                {logo}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES SECTION ────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 scroll-mt-24 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge-purple mb-3">Feature Highlights</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Practice Every Type of Round
          </h2>
          <p className="text-gray-400 leading-relaxed">
            From adaptive behavioral prompts to custom skill keywords, our mock features are crafted to prepare you for actual technical loops.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <motion.div custom={0} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-5 border border-indigo-500/20">
                <FiCpu className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Mock Interview</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Adaptive Gemini-powered mock rounds that progressively increase in difficulty as you answer.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">Adaptive Questions <FiArrowRight /></span>
          </motion.div>

          {/* Card 2 */}
          <motion.div custom={1} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-5 border border-purple-500/20">
                <FiBarChart2 className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Answer Scoring</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Instant rubric feedback evaluating Structure, Relevance, Specificity, and Clarity.
              </p>
            </div>
            <span className="text-xs text-purple-400 font-bold flex items-center gap-1">Detailed Rubrics <FiArrowRight /></span>
          </motion.div>

          {/* Card 3 */}
          <motion.div custom={2} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-5 border border-cyan-500/20">
                <FiMic className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Voice Practice Mode</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Speak out loud. Get Whisper-powered transcriptions along with filler word and pace logs.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-bold flex items-center gap-1">Speaking Telemetry <FiArrowRight /></span>
          </motion.div>

          {/* Card 4 */}
          <motion.div custom={3} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-5 border border-emerald-500/20">
                <FiUploadCloud className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Resume-Based Questions</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Upload your resume to instantly generate custom questions tailored specifically to your history.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">Personalized Focus <FiArrowRight /></span>
          </motion.div>

          {/* Card 5 */}
          <motion.div custom={4} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-5 border border-amber-500/20">
                <FiZap className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Progress Analytics</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Track streaks, chart score metrics over time, and spot key communication gaps.
              </p>
            </div>
            <span className="text-xs text-amber-400 font-bold flex items-center gap-1">Improvement Dashboards <FiArrowRight /></span>
          </motion.div>

          {/* Card 6 */}
          <motion.div custom={5} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[260px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-5 border border-rose-500/20">
                <FiUsers className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Peer Practice Match</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Enter peer matchmaking loops or generate room keys to code live and grade with partners.
              </p>
            </div>
            <span className="text-xs text-rose-400 font-bold flex items-center gap-1">Collaborative Coding <FiArrowRight /></span>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="badge-cyan mb-3">Workflow</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            How PrepIntellect Works
          </h2>
          <p className="text-gray-400">Mastering interviews is easier in three simple steps.</p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] z-0 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500/10 via-purple-500/50 to-cyan-500/10 bg-[size:200%_auto] animate-border-shift" />
          </div>

          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative z-10 text-center space-y-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-indigo-500/30 bg-navy-950 text-indigo-400 font-bold text-xl shadow-glow pulse-ring">
              1
            </div>
            <h3 className="text-lg font-bold text-white">Select Your Focus</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Define your role category (Tech, Aviation, SSB, Medical), experience level, and timeline.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative z-10 text-center space-y-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/30 bg-navy-950 text-purple-400 font-bold text-xl shadow-glow pulse-ring">
              2
            </div>
            <h3 className="text-lg font-bold text-white">Simulate the Round</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Answer adaptive, Gemini-constructed questions via camera and voice to mimic a real exam.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative z-10 text-center space-y-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/30 bg-navy-950 text-cyan-400 font-bold text-xl shadow-glow pulse-ring">
              3
            </div>
            <h3 className="text-lg font-bold text-white">Review Rubric & Scores</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Receive a granular scorecard breakdown showing communication streaks and direct code tips.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SCORE BREAKDOWN PREVIEW ──────────────────────────────── */}
      <section id="interactive-demo" className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="glass-card-strong p-8 md:p-12 rounded-2xl border border-indigo-500/20 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-left">
            <span className="badge-emerald"><FiZap /> Rubric Breakdown</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Know exactly where to improve, not just how you scored.
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every mock answer is analyzed on five custom communication indices. We show you the gaps between your explanation and a model answer, complete with concrete numbers and phrasing edits.
            </p>
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 shrink-0" />
                <span className="text-gray-300">STAR structure tracking checks</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 shrink-0" />
                <span className="text-gray-300">Filler-words and pacing frequency counter</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 shrink-0" />
                <span className="text-gray-300">Detailed reference answers for study</span>
              </div>
            </div>
          </div>

          {/* Interactive Score Preview widget */}
          <div className="bg-navy-950/50 rounded-xl p-5 border border-white/5 text-left space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-white">Overall Session Grade</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">7.4 / 10</span>
            </div>
            
            <div className="space-y-3 font-mono text-[10px]">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">STAR Structure</span>
                  <span className="text-gray-200">8/10</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 w-[80%] h-full" />
                </div>
                <p className="text-[9px] text-indigo-400 italic">"Excellent use of STAR format in your leadership answer."</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Specificity & Metrics</span>
                  <span className="text-gray-200">6/10</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 w-[60%] h-full" />
                </div>
                <p className="text-[9px] text-amber-400 italic">"Try adding concrete metrics (e.g. latency decreased by X%) to explain outcome."</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Verbal Clarity</span>
                  <span className="text-gray-200">7/10</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 w-[70%] h-full" />
                </div>
                <p className="text-[9px] text-indigo-400 italic">"A bit of trailing repetition in the middle of system design."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <span className="badge-purple mb-3">Feedback</span>
        <h2 className="text-3xl font-bold text-white mb-10">Candidate Success Stories</h2>
        
        <div className="glass-card-strong p-8 md:p-12 relative overflow-hidden rounded-2xl border border-indigo-500/20">
          <div className="absolute top-0 left-0 p-4 opacity-10 text-indigo-400 text-6xl font-serif">“</div>
          
          <div className="min-h-[160px] md:min-h-[120px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="flex justify-center gap-1 text-yellow-500 mb-2">
                  {Array.from({ length: testimonials[activeTestimonial].stars }).map((_, i) => (
                    <FiStar key={i} className="fill-current text-amber-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base md:text-lg italic text-gray-200 leading-relaxed max-w-2xl mx-auto">
                  "{testimonials[activeTestimonial].quote}"
                </p>
                <div>
                  <h4 className="text-sm font-bold text-white">{testimonials[activeTestimonial].author}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{testimonials[activeTestimonial].role}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeTestimonial ? "w-6 bg-indigo-500" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handlePrevTestimonial}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition"
              >
                <FiChevronLeft />
              </button>
              <button 
                onClick={handleNextTestimonial}
                className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ────────────────────────────────── */}
      <section className="text-center max-w-4xl mx-auto px-6 z-10">
        <div className="glass-card-strong p-10 md:p-14 border border-indigo-500/20 rounded-3xl relative overflow-hidden bg-gradient-to-r from-navy-950 via-indigo-950/20 to-navy-950">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-cyan-500/5 blur-[50px] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready for your next interview?
          </h2>
          <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            Personalize your target timeline, practice with adaptive AI, and study scoring evaluations. Get started for free.
          </p>
          <button 
            onClick={onGetStarted}
            className="btn-primary px-10 py-4 text-base shadow-xl"
          >
            Start Free Practice <FiArrowRight className="ml-1" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 pt-12 pb-6 relative z-10 text-left text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-3 ColSpan-2">
            <h4 className="text-sm font-bold text-white">Prep<span className="text-gradient">Intellect</span></h4>
            <p className="leading-relaxed max-w-xs">
              Personalized mock interview suites with adaptive generative queries, visual guardrails, and speech communication score reports.
            </p>
          </div>
          <div className="space-y-3">
            <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">Product</h5>
            <ul className="space-y-2">
              <li><button onClick={onGetStarted} className="hover:text-white transition">Mock Practice</button></li>
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#interactive-demo" className="hover:text-white transition">Scoring Demo</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-white/5 pt-6 flex justify-between items-center">
          <p>© {new Date().getFullYear()} PrepIntellect. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-gray-600 font-medium">Made for candidates everywhere</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
