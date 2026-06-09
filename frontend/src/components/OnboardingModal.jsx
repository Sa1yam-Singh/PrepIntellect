import { useState, useEffect } from "react";
import { FiBriefcase, FiTrendingUp, FiCalendar, FiChevronRight, FiChevronLeft, FiX, FiCheck } from "react-icons/fi";

export default function OnboardingModal({ isOpen, onClose, onComplete, userEmail }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [otherRole, setOtherRole] = useState("");
  const [experience, setExperience] = useState("");
  const [timeline, setTimeline] = useState("");
  const [company, setCompany] = useState("");
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Esc key listener for skip confirmation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !showSkipConfirm) {
        setShowSkipConfirm(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showSkipConfirm]);

  if (!isOpen) return null;

  const roles = [
    { id: "Software Engineer", label: "Software Engineer" },
    { id: "Product Manager", label: "Product Manager" },
    { id: "Data Scientist", label: "Data Scientist / Analyst" },
    { id: "UX Designer", label: "UX / Product Designer" },
    { id: "Marketing", label: "Marketing / Growth" },
    { id: "Finance", label: "Finance / Consulting" },
    { id: "Other", label: "Other" }
  ];

  const experienceLevels = [
    { id: "Entry-Level", title: "Entry level", duration: "0–2 years", desc: "Focus on technical fundamentals, introductory system design, and culture fit." },
    { id: "Mid-Level", title: "Mid level", duration: "3–6 years", desc: "Focus on design patterns, practical tools, and solid communication." },
    { id: "Senior", title: "Senior / Lead", duration: "7+ years", desc: "Focus on advanced distributed architecture, leadership, and product strategy." }
  ];

  const timelines = [
    "Today or tomorrow",
    "This week",
    "Next 2–4 weeks",
    "Just exploring"
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      const selectedRole = role === "Other" ? otherRole || "Other" : role;
      onComplete({
        targetRole: selectedRole,
        experienceLevel: experience,
        timeline: timeline,
        companyName: company,
        onboarding_complete: true
      });
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const isNextDisabled = () => {
    if (step === 1 && !role) return true;
    if (step === 1 && role === "Other" && !otherRole.trim()) return true;
    if (step === 2 && !experience) return true;
    if (step === 3 && !timeline) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => setShowSkipConfirm(true)} 
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-navy-950/90 p-8 shadow-2xl backdrop-blur-xl animate-scale-in text-white">
        
        {/* Close Button */}
        <button 
          onClick={() => setShowSkipConfirm(true)}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition"
        >
          <FiX className="text-lg" />
        </button>

        {/* Progress & Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex gap-2 mb-3">
            <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-indigo-500" : "bg-white/20"}`} />
            <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-indigo-500" : "bg-white/20"}`} />
            <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${step >= 3 ? "bg-indigo-500" : "bg-white/20"}`} />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Step {step} of 3</span>
        </div>

        {/* Dynamic Step Content */}
        <div className="min-h-[280px]">
          
          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight text-white mb-2">What role are you preparing for?</h3>
                <p className="text-xs text-gray-400">We'll tailor your questions to fit this specific role.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition ${
                      role === r.id 
                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-white" 
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300"
                    }`}
                  >
                    <FiBriefcase className={`text-lg shrink-0 ${role === r.id ? "text-indigo-400" : "text-gray-500"}`} />
                    <span className="text-sm font-semibold">{r.label}</span>
                  </button>
                ))}
              </div>

              {role === "Other" && (
                <div className="animate-slide-up">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Specify Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Mobile Developer, Security Engineer"
                    value={otherRole}
                    onChange={(e) => setOtherRole(e.target.value)}
                    className="auth-input"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Experience Level */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight text-white mb-2">What's your experience level?</h3>
                <p className="text-xs text-gray-400">We adjust the depth and difficulty of your design and tech rounds.</p>
              </div>

              <div className="space-y-3">
                {experienceLevels.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setExperience(exp.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left w-full transition ${
                      experience === exp.id 
                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-white" 
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      experience === exp.id ? "border-indigo-400 bg-indigo-500/20 text-indigo-400" : "border-gray-600"
                    }`}>
                      {experience === exp.id && <FiCheck className="text-xs font-bold" />}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold">{exp.title}</span>
                        <span className="text-[10px] font-semibold text-gray-500">({exp.duration})</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{exp.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Timeline & Company */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight text-white mb-2">When is your interview?</h3>
                <p className="text-xs text-gray-400">Helps us recommend an optimal study speed.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {timelines.map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeline(time)}
                    className={`p-3 rounded-full border text-xs font-bold transition text-center ${
                      timeline === time 
                        ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" 
                        : "border-white/10 bg-white/5 hover:bg-white/10 text-gray-400"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Target Company Name <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <FiCalendar className="absolute top-3.5 left-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="e.g. Google, Stripe, Meta"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="auth-input pl-11"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold transition active:scale-[0.98] text-gray-300 hover:text-white"
            >
              <FiChevronLeft /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="btn-primary px-8 py-3 text-sm"
          >
            {step === 3 ? "Start Practicing" : "Next"} <FiChevronRight />
          </button>
        </div>

        {/* Skip Confirmation Overlay Modal */}
        {showSkipConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-navy-950/95 backdrop-blur-md rounded-2xl animate-scale-in">
            <div className="text-center max-w-sm space-y-6">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <FiX className="text-2xl" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Skip personalization setup?</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  You can configure your role details and targets later in your Settings profile page at any time.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="btn-primary flex-1 py-3 text-xs"
                >
                  Continue Setup
                </button>
                <button
                  onClick={() => {
                    setShowSkipConfirm(false);
                    onClose(); // Triggers skip completion callbacks
                  }}
                  className="btn-secondary flex-1 py-3 text-xs"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
