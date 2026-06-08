import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCpu, FiUsers, FiBarChart2, FiVideo, FiTrendingUp, FiShield, FiCheckCircle, FiStar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

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
  const [typedText, setTypedText] = useState("");
  const fullText = "Simulate realistic coding and behavioral rounds with state-of-the-art AI. Receive real-time grading, deep analytics, and actionable advice to land your dream job.";

  // Typewriter Effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, []);

  // Testimonials Carousel State
  const testimonials = [
    {
      quote: "PrepIntellect helped me identify three major communication flaws in my system design answers. The per-question AI feedback was incredibly helpful. Landed my Senior role at Stripe!",
      author: "Elena R.",
      role: "Senior Software Engineer"
    },
    {
      quote: "The real-time camera tracking and terminal feed forced me to stop looking away. The behavioral guardrails made the mock feel just like a real high-stakes exam.",
      author: "Marcus K.",
      role: "L5 Engineer at Google"
    },
    {
      quote: "The Text-to-Speech voices and prompt customization made me feel like I was speaking to a real recruiter. Highly recommend using it before any tech loop.",
      author: "Priya S.",
      role: "Fullstack Developer"
    }
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
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
        delay: i * 0.15,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  return (
    <div className="space-y-24 py-12 md:py-20 relative overflow-hidden">
      
      {/* ── BACKGROUND ORBS ──────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="floating-orb w-[350px] h-[350px] bg-indigo-500/10 top-1/4 left-10" />
        <div className="floating-orb w-[220px] h-[220px] bg-purple-500/8 top-1/2 right-10" style={{ animationDelay: "2s" }} />
        <div className="floating-orb w-[280px] h-[280px] bg-cyan-500/6 bottom-1/4 left-1/3" style={{ animationDelay: "4s" }} />
      </div>

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="relative text-center max-w-4xl mx-auto px-6 z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-6 backdrop-blur-sm animate-pulse"
        >
          <FiCpu className="text-sm" /> Powered by Gemini & Whisper AI
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
        >
          Master Your Next Tech Interview with <span className="text-gradient-moving">PrepIntellect</span>
        </motion.h1>
        
        {/* Typewriter text block with fixed height to prevent content layout shift */}
        <div className="min-h-[64px] sm:min-h-[48px] max-w-2xl mx-auto mb-10">
          <p className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed">
            {typedText}
            <span className="inline-block w-1 h-4 bg-indigo-400 ml-1 animate-pulse" />
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={onGetStarted}
            className="btn-primary w-full sm:w-auto px-8 py-4 text-base"
          >
            Start Free Practice
          </button>
          <a 
            href="#features"
            className="btn-secondary w-full sm:w-auto px-8 py-4 text-base"
          >
            Explore Features
          </a>
        </motion.div>

        {/* Stats strip with real count-up animations */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-20 border-t border-white/5 pt-10 text-center"
        >
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              <CountUp end={15000} suffix="+" />
            </p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Interviews Completed</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">
              <CountUp end={98} suffix="%" />
            </p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">User Satisfaction</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
              <CountUp end={200} suffix="+" />
            </p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">AI Roles Supported</p>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES SECTION ────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 scroll-mt-24 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Built For Serious Engineers
          </h2>
          <p className="text-gray-400 leading-relaxed">
            From algorithmic challenges to deep architecture discussions, we've designed prep tools to challenge you like a real panel.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <motion.div custom={0} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[280px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-5">
                <FiCpu className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">🤖 AI Mock Sessions</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Experience simulated coding and system design interviews tailored to your experience.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-semibold">Gemini Flash-powered →</span>
          </motion.div>

          {/* Card 2 */}
          <motion.div custom={1} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[280px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-5">
                <FiUsers className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">👥 Peer Meetings</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect and practice live coding with other candidates using our video meeting system.
              </p>
            </div>
            <span className="text-xs text-purple-400 font-semibold">Live peer matching →</span>
          </motion.div>

          {/* Card 3 */}
          <motion.div custom={2} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[280px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-5">
                <FiBarChart2 className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">📊 Analytics Dashboard</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Unlock actionable score breakdowns, timeline analyses, and granular improvement suggestions.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-semibold">Instant score reports →</span>
          </motion.div>

          {/* Card 4 */}
          <motion.div custom={3} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card-hover p-6 flex flex-col justify-between h-[280px]"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-5">
                <FiVideo className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">⚡ Instant Room Codes</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Create custom coding rooms and invite friends or mentors in just one click.
              </p>
            </div>
            <span className="text-xs text-teal-400 font-semibold">No login required for joins →</span>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-400">Get ready for your interviews in three simple stages.</p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector Line (Desktop) with animated gradient shifting */}
          <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] z-0 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500/10 via-purple-500/50 to-cyan-500/10 bg-[size:200%_auto] animate-border-shift" 
                 style={{ animation: "borderShift 4s ease infinite" }} />
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
            <h3 className="text-lg font-bold text-white">Select Your Role</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              Define your target role, experience tier, and target keywords to customize the interview scope.
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
            <h3 className="text-lg font-bold text-white">Conduct the Simulation</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              Answer Gemini-curated coding and behavior questions with full webcam and audio feedback support.
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
            <h3 className="text-lg font-bold text-white">Unlock Deep Analytics</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              Review your grade reports, sentiment analytics, and reference models to refine your answers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 relative z-10 text-center">
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
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
                  <FiStar className="fill-current" />
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

      {/* ── TRUST & RELIABILITY ────────────────────────────────── */}
      <section className="glass-card-strong max-w-5xl mx-auto mx-6 p-8 md:p-12 relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-cyan-500/5 blur-[50px] pointer-events-none" />
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <FiShield /> Production Grade Sandbox
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              A private workspace designed to help you fail forward.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your audio, transcripts, and camera feeds are processed entirely client-side or securely analyzed via Google Gemini API. We never sell your personal data.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <FiCheckCircle className="text-indigo-400" /> Full camera & screen share sandbox
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <FiCheckCircle className="text-indigo-400" /> Complete audio recording tools
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <FiCheckCircle className="text-indigo-400" /> Granular mock fallback logic
              </div>
            </div>
          </div>
          
          <div className="rounded-xl p-6 font-mono text-xs text-gray-300 space-y-4 cyber-glow bg-navy-950/40">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/50" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/50" />
              </div>
              <span className="text-[10px] text-gray-500">prepmock_runner.js</span>
            </div>
            <p className="text-indigo-300">// Initializing Gemini Evaluation Model...</p>
            <p className="text-gray-400">const evaluator = genAI.getGenerativeModel(&#123; model: "gemini-2.0-flash" &#125;);</p>
            <p className="text-cyan-400">await evaluator.generateContent([ prompt, answer ]);</p>
            <p className="text-emerald-400">// Output: {"{ score: 94, sentiment: \"Confident\" }"}</p>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 mt-4">
              <span className="text-[10px] text-gray-400 font-bold tracking-wide uppercase">AI grading status</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ──────────────────────────────────────── */}
      <section className="text-center max-w-3xl mx-auto px-6 py-6 relative z-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          Ready to Ace Your Next Round?
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Start practicing now and get immediate feedback on your answers. No credit card required.
        </p>
        <button 
          onClick={onGetStarted}
          className="btn-primary px-10 py-4 text-base"
        >
          Get Started For Free
        </button>
      </section>

    </div>
  );
}
