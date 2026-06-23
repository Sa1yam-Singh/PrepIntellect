import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import DashboardHub from "./components/DashboardHub";
import InterviewChamber from "./components/InterviewChamber";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import MeetRoom from "./components/MeetRoom";
import ProfilePage from "./components/ProfilePage";
import OnboardingModal from "./components/OnboardingModal";
import ResumePage from "./components/ResumePage";
import QuestionBank from "./components/QuestionBank";
import PracticeSession from "./components/PracticeSession";
import PublicReport from "./components/PublicReport";
import { FiX, FiCpu, FiFileText, FiBookOpen, FiUser, FiActivity } from "react-icons/fi";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

export default function App() {
  // ── Auth & View states ──────────────────────────────────────────
  const [view, setView] = useState(() => {
    return sessionStorage.getItem("prep_intellect_view") || "landing";
  });
  const [user, setUser] = useState(() => {
    const savedMock = sessionStorage.getItem("prep_intellect_mock_user");
    return savedMock ? JSON.parse(savedMock) : null;
  });
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: "login" });
  
  // Theme state & Onboarding modal state
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Sync theme attribute to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ── Session data ────────────────────────────────────────────────
  const [userId, setUserId] = useState(() => {
    return sessionStorage.getItem("prep_intellect_user_db_id") || null;
  });
  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem("prep_intellect_session_id") || null;
  });
  const [evaluation, setEvaluation] = useState(null); // Fresh evaluation each time
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeMeetCode, setActiveMeetCode] = useState(() => {
    return sessionStorage.getItem("prep_intellect_meet_code") || null;
  });
  const [isPeerMatch, setIsPeerMatch] = useState(() => {
    return sessionStorage.getItem("prep_intellect_is_peer_match") === "true";
  });
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [publicReportId, setPublicReportId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");

  const addToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const dbRes = await API.get(`/users/${encodeURIComponent(user.email)}`);
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          xp: dbRes.data.xp,
          streak: dbRes.data.streak,
          targetRole: dbRes.data.targetRole,
          experienceLevel: dbRes.data.experienceLevel,
          category: dbRes.data.category,
          skillsKeywords: dbRes.data.skillsKeywords || [],
        };
      });
    } catch (err) {
      console.log("Failed to refresh user profile:", err);
    }
  }, [user?.email]);

  // Sync user profile data when switching views to dashboard or profile
  useEffect(() => {
    if (view === "dashboard" || view === "profile") {
      refreshUserProfile();
    }
  }, [view, refreshUserProfile]);

  // Listen for public report paths on boot
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/report\/([a-fA-F0-9]{24})/);
    if (match) {
      setPublicReportId(match[1]);
      setView("public-report");
    }
  }, []);

  // Global Keyboard Shortcuts Effect
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      const isInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
      
      // '?' opens shortcuts sheet (only if not writing in inputs)
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Ctrl + K opens Command Palette
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette(prev => !prev);
        setPaletteSearch("");
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // ── Interview config form state ─────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "Personal",
    category: "Engineering",
    targetRole: "Software Engineer",
    experienceLevel: "Mid-Level",
    skillsKeywords: "",
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          organization: "Personal"
        };
        
        try {
          const dbRes = await API.get(`/users/${encodeURIComponent(firebaseUser.email)}`);
          setUserId(dbRes.data._id);
          userData.organization = dbRes.data.organization || "Personal";
          userData.category = dbRes.data.category || "Engineering";
          userData.targetRole = dbRes.data.targetRole || "Software Engineer";
          userData.experienceLevel = dbRes.data.experienceLevel || "Mid-Level";
          userData.skillsKeywords = dbRes.data.skillsKeywords || [];
          userData.onboarding_complete = dbRes.data.onboarding_complete !== undefined ? dbRes.data.onboarding_complete : false;
          userData.timeline = dbRes.data.timeline || "";
          userData.companyName = dbRes.data.companyName || "";
          
          if (userData.onboarding_complete === false) {
            setOnboardingOpen(true);
          }
        } catch (err) {
          console.log("User not found in database yet.");
          setOnboardingOpen(true); // new user, prompt onboarding
        }

        setUser(userData);
        sessionStorage.removeItem("prep_intellect_mock_user"); // Firebase has active user, clear mock user
        setForm(prev => ({
          ...prev,
          name: userData.name,
          email: userData.email,
          organization: userData.organization || prev.organization || "Personal",
          category: userData.category || prev.category || "Engineering",
          targetRole: userData.targetRole || prev.targetRole,
          experienceLevel: userData.experienceLevel || prev.experienceLevel,
          skillsKeywords: userData.skillsKeywords?.join(", ") || prev.skillsKeywords
        }));
        setView(prev => prev === "landing" ? "dashboard" : prev);
      } else {
        // Check if there is an active mock user session in sessionStorage
        const savedMock = sessionStorage.getItem("prep_intellect_mock_user");
        if (savedMock) {
          const userData = JSON.parse(savedMock);
          
          try {
            const dbRes = await API.get(`/users/${encodeURIComponent(userData.email)}`);
            setUserId(dbRes.data._id);
            userData.organization = dbRes.data.organization || "Personal";
            userData.category = dbRes.data.category || "Engineering";
            userData.targetRole = dbRes.data.targetRole || "Software Engineer";
            userData.experienceLevel = dbRes.data.experienceLevel || "Mid-Level";
            userData.skillsKeywords = dbRes.data.skillsKeywords || [];
            userData.onboarding_complete = dbRes.data.onboarding_complete !== undefined ? dbRes.data.onboarding_complete : false;
            userData.timeline = dbRes.data.timeline || "";
            userData.companyName = dbRes.data.companyName || "";
            
            if (userData.onboarding_complete === false) {
              setOnboardingOpen(true);
            }
          } catch (err) {
            console.log("Mock user not found in database yet.");
            setOnboardingOpen(true);
          }

          setUser(userData);
          setForm(prev => ({
            ...prev,
            name: userData.name,
            email: userData.email,
            organization: userData.organization || prev.organization || "Personal",
            category: userData.category || prev.category || "Engineering",
            targetRole: userData.targetRole || prev.targetRole,
            experienceLevel: userData.experienceLevel || prev.experienceLevel,
            skillsKeywords: userData.skillsKeywords?.join(", ") || prev.skillsKeywords
          }));
          setView(prev => prev === "landing" ? "dashboard" : prev);
        } else {
          setUser(null);
          setView(prev => prev === "dashboard" || prev === "onboarding" || prev === "interview" || prev === "meet-room" || prev === "profile" ? "landing" : prev);
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync view state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("prep_intellect_view", view);
  }, [view]);

  // Sync session data to sessionStorage
  useEffect(() => {
    if (userId) {
      sessionStorage.setItem("prep_intellect_user_db_id", userId);
    } else {
      sessionStorage.removeItem("prep_intellect_user_db_id");
    }
  }, [userId]);

  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem("prep_intellect_session_id", sessionId);
    } else {
      sessionStorage.removeItem("prep_intellect_session_id");
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeMeetCode) {
      sessionStorage.setItem("prep_intellect_meet_code", activeMeetCode);
    } else {
      sessionStorage.removeItem("prep_intellect_meet_code");
    }
  }, [activeMeetCode]);

  useEffect(() => {
    sessionStorage.setItem("prep_intellect_is_peer_match", isPeerMatch ? "true" : "false");
  }, [isPeerMatch]);

  const handleFormChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  // ── Auth handlers ───────────────────────────────────────────────
  const handleOpenAuth = (mode = "login") => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    if (userData.uid.startsWith("mock-")) {
      sessionStorage.setItem("prep_intellect_mock_user", JSON.stringify(userData));
    }
    
    // Check onboarding for mock user
    try {
      const dbRes = await API.get(`/users/${encodeURIComponent(userData.email)}`);
      setUserId(dbRes.data._id);
      if (dbRes.data.onboarding_complete === false) {
        setOnboardingOpen(true);
      }
    } catch (err) {
      setOnboardingOpen(true);
    }

    setForm(prev => ({
      ...prev,
      name: userData.name || prev.name,
      email: userData.email || prev.email
    }));
    setView("dashboard");
  };

  const handleOnboardingComplete = async (onboardingData) => {
    try {
      const payload = {
        name: user.name,
        email: user.email,
        ...onboardingData
      };
      
      const res = await API.post("/users", payload);
      setUserId(res.data._id);
      
      const updatedUser = {
        ...user,
        targetRole: res.data.targetRole,
        experienceLevel: res.data.experienceLevel,
        timeline: res.data.timeline,
        companyName: res.data.companyName,
        onboarding_complete: true
      };
      
      setUser(updatedUser);
      setForm(prev => ({
        ...prev,
        targetRole: res.data.targetRole,
        experienceLevel: res.data.experienceLevel,
        skillsKeywords: res.data.skillsKeywords?.join(", ") || prev.skillsKeywords
      }));
      setOnboardingOpen(false);
      setView("dashboard");
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch((err) => console.error("Firebase logout failed", err));
    setUser(null);
    setUserId(null);
    setSessionId(null);
    setEvaluation(null);
    setActiveMeetCode(null);
    sessionStorage.removeItem("prep_intellect_mock_user");
    sessionStorage.removeItem("prep_intellect_view");
    sessionStorage.removeItem("prep_intellect_meet_code");
    sessionStorage.removeItem("prep_intellect_session_id");
    sessionStorage.removeItem("prep_intellect_user_db_id");
    sessionStorage.removeItem("prep_intellect_is_peer_match");
    setView("landing");
  };

  // ── Meet Room handlers ──────────────────────────────────────────
  const handleJoinMeetRoom = (code, isPeer = false) => {
    setActiveMeetCode(code);
    setIsPeerMatch(isPeer);
    setView("meet-room");
  };

  // ── Start Interview ─────────────────────────────────────────────
  const handleStartInterview = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const userPayload = {
          ...form,
          skillsKeywords: form.skillsKeywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };

        // Always upsert user profile on start to keep data updated
        let uid;
        try {
          const userRes = await API.post("/users", userPayload);
          uid = userRes.data._id;
          
          const authenticatedUser = {
            name: userRes.data.name,
            email: userRes.data.email,
            uid: user?.uid || `mock-${uid}`,
            organization: userRes.data.organization || "Personal",
            category: userRes.data.category || "Engineering",
            targetRole: userRes.data.targetRole,
            experienceLevel: userRes.data.experienceLevel,
            skillsKeywords: userRes.data.skillsKeywords || [],
          };
          setUser(authenticatedUser);
          if (!user || user.uid.startsWith("mock-")) {
            sessionStorage.setItem("prep_intellect_mock_user", JSON.stringify(authenticatedUser));
          }
        } catch (err) {
          throw err;
        }
        setUserId(uid);

        // Start interview session
        const startRes = await API.post("/interview/start", { userId: uid });
        setSessionId(startRes.data.sessionId);
        setView("interview");
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [form, userId, user]
  );

  // ── Interview Complete ──────────────────────────────────────────
  const handleInterviewComplete = useCallback((evalData) => {
    setEvaluation(evalData);
    setView("analytics");
  }, []);

  // ── Navigation routing actions ──────────────────────────────────
  const handleGetStarted = () => {
    if (user) {
      setView("dashboard");
    } else {
      handleOpenAuth("signup");
    }
  };

  const handleStartAIMock = () => {
    setView("onboarding");
  };

  return (
    <div className="relative min-h-screen bg-navy-950 bg-grid-pattern bg-grid-animate text-gray-100 flex flex-col">
      {/* Background grain noise effect */}
      <div className="bg-noise" />

      {/* Header component */}
      <Header 
        currentView={view} 
        setView={setView} 
        user={user} 
        onLogout={handleLogout} 
        openAuthModal={handleOpenAuth} 
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Content Router */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-6 py-8 relative z-10">
        
        {/* Landing Page View */}
        {view === "landing" && (
          <LandingPage 
            onGetStarted={handleGetStarted} 
            openAuthModal={handleOpenAuth} 
          />
        )}

        {/* Dashboard Hub View */}
        {view === "dashboard" && user && (
          <DashboardHub 
            user={user} 
            onStartAIMock={handleStartAIMock} 
            onBackToLanding={() => setView("landing")} 
            onJoinMeetRoom={handleJoinMeetRoom}
            onViewReport={(sessId, evaluationData) => {
              setSessionId(sessId);
              setEvaluation(evaluationData);
              setView("analytics");
            }}
            navigateToView={setView}
          />
        )}

        {/* AI Mock Interview Onboarding Config View */}
        {view === "onboarding" && (
          <div className="mx-auto max-w-lg animate-fade-in py-8">
            <div className="mb-8 text-center">
              <span className="badge-purple mb-3">AI Setup Mode</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Configure Your Mock
              </h2>
              <p className="text-gray-400 text-sm">
                Provide details below so our AI evaluator can construct tailored algorithmic and behavioral inquiries.
              </p>
            </div>

            <form onSubmit={handleStartInterview} className="glass-card-strong p-8 space-y-5">
              
              {/* Name */}
              {!user && (
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleFormChange}
                    className="auth-input"
                    placeholder="Jane Doe"
                  />
                </div>
              )}

              {/* Email */}
              {!user && (
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleFormChange}
                    className="auth-input"
                    placeholder="jane@company.com"
                  />
                </div>
              )}

              {/* Organization */}
              <div>
                <label htmlFor="organization" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Organization / Company
                </label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  required
                  value={form.organization || ""}
                  onChange={handleFormChange}
                  className="auth-input"
                  placeholder="Google / Personal / University"
                />
              </div>

              {/* Category / Course selection */}
              <div>
                <label htmlFor="category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Interview Category / Course
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    let targetRole = "Software Engineer";
                    let skillsKeywords = "React, Node.js, JavaScript";
                    let experienceLevel = "Mid-Level";

                    if (cat === "Medical") {
                      targetRole = "Resident Medical Officer";
                      skillsKeywords = "Anatomy, General Medicine, Patient Care";
                      experienceLevel = "MBBS Graduate";
                    } else if (cat === "Defense") {
                      targetRole = "SSB Army Cadet";
                      skillsKeywords = "Officer Like Qualities (OLQs), General Knowledge, Situation Reaction";
                      experienceLevel = "SSB Aspirant";
                    } else if (cat === "Aviation") {
                      targetRole = "Air Hostess / Cabin Crew";
                      skillsKeywords = "Customer Service, Aviation Safety, First Aid, Verbal Communication";
                      experienceLevel = "Trainee";
                    }

                    setForm(prev => ({
                      ...prev,
                      category: cat,
                      targetRole,
                      skillsKeywords,
                      experienceLevel
                    }));
                  }}
                  className="auth-input bg-navy-900"
                >
                  <option value="Engineering">Engineering / IT / Tech</option>
                  <option value="Medical">Medical / Healthcare / AIIMS</option>
                  <option value="Defense">Defense Services (NDA SSB, CDS SSB)</option>
                  <option value="Aviation">Aviation & Hospitality (Air Hostess)</option>
                </select>
              </div>

              {/* Target Role */}
              <div>
                <label htmlFor="targetRole" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Target Role
                </label>
                <input
                  id="targetRole"
                  name="targetRole"
                  type="text"
                  required
                  value={form.targetRole}
                  onChange={handleFormChange}
                  className="auth-input"
                  placeholder="Systems Software Engineer"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label htmlFor="experienceLevel" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Experience Level
                </label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={form.experienceLevel}
                  onChange={handleFormChange}
                  className="auth-input bg-navy-900"
                >
                  <option value="Intern">Intern</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Staff">Staff</option>
                  <option value="Principal">Principal</option>
                </select>
              </div>

              {/* Skills */}
              <div>
                <label htmlFor="skillsKeywords" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Skills & Keywords
                </label>
                <input
                  id="skillsKeywords"
                  name="skillsKeywords"
                  type="text"
                  required
                  value={form.skillsKeywords}
                  onChange={handleFormChange}
                  className="auth-input"
                  placeholder="C++, Kernel Internals, Linux, Distributed Systems"
                />
                <p className="mt-1.5 text-[10px] text-gray-500 font-medium">Use a comma-separated list of technologies.</p>
              </div>

              {/* Error messages */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setView(user ? "dashboard" : "landing")}
                  className="btn-secondary w-1/3"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Spawning AI...
                    </>
                  ) : (
                    "Launch Mock"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Mock Interview Chamber View */}
        {view === "interview" && sessionId && (
          <InterviewChamber
            sessionId={sessionId}
            onComplete={handleInterviewComplete}
          />
        )}

        {/* Post-Interview Analytics Dashboard Report */}
        {view === "analytics" && evaluation && (
          <AnalyticsDashboard
            sessionId={sessionId}
            evaluation={evaluation}
            onRestart={() => setView("dashboard")}
            addToast={addToast}
          />
        )}

        {/* In-App Custom Video Peer Meet Room */}
        {view === "meet-room" && activeMeetCode && (
          <MeetRoom
            code={activeMeetCode}
            isPeerMatch={isPeerMatch}
            user={user}
            onLeave={() => setView("dashboard")}
          />
        )}

        {/* Profile View */}
        {view === "profile" && user && (
          <ProfilePage
            user={user}
            setUser={setUser}
            onLogout={handleLogout}
            onViewReport={(sessId, evaluationData) => {
              setSessionId(sessId);
              setEvaluation(evaluationData);
              setView("analytics");
            }}
          />
        )}

        {/* Resume Uploader & AI Question Generator View */}
        {view === "resume" && (
          <ResumePage 
            onStartPractice={(question) => {
              setPracticeQuestion(question);
              setView("practice");
            }}
            addToast={addToast}
          />
        )}

        {/* Curated Question Bank View */}
        {view === "question-bank" && (
          <QuestionBank 
            user={user}
            onStartPractice={(question) => {
              setPracticeQuestion(question);
              setView("practice");
            }}
            addToast={addToast}
          />
        )}

        {/* Practice Sandbox modal wrapper */}
        {view === "practice" && practiceQuestion && (
          <PracticeSession 
            questionText={practiceQuestion}
            user={user}
            refreshUser={refreshUserProfile}
            onClose={() => {
              setPracticeQuestion(null);
              setView("dashboard");
            }}
            addToast={addToast}
          />
        )}

        {/* Shared Public Report view */}
        {view === "public-report" && publicReportId && (
          <PublicReport 
            sessionId={publicReportId} 
          />
        )}

      </main>

      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
        userEmail={user?.email}
      />

      {/* Global Auth Modal Overlay */}
      <AuthModal 
        isOpen={authModal.isOpen} 
        onClose={handleCloseAuth} 
        initialMode={authModal.mode} 
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Keyboard Shortcuts Sheet Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-card-strong p-6 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Keyboard Shortcuts
              </h4>
              <button 
                onClick={() => setShowShortcuts(false)} 
                className="text-gray-500 hover:text-white"
              >
                <FiX />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-gray-400 font-medium">Open Cheat Sheet</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">?</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-gray-400 font-medium">Command Palette</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-gray-400 font-medium">Toggle Voice Record</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">R</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-gray-400 font-medium">Submit Response</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-gray-400 font-medium">Next Question</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">Ctrl + →</kbd>
              </div>
              <div className="flex justify-between items-center pb-0.5">
                <span className="text-gray-400 font-medium">Exit Active Practice</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-indigo-300">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Command Palette Modal */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-card-strong p-4 space-y-3 text-left animate-slide-down">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Type a page or command to navigate..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                autoFocus
              />
            </div>
            
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {[
                { title: "Go to Dashboard Hub", view: "dashboard" },
                { title: "Analyze Resume (Upload)", view: "resume" },
                { title: "Curated Question Bank", view: "question-bank" },
                { title: "My Profile Details", view: "profile" },
                { title: "Launch AI Mock Interview", view: "onboarding" },
              ]
                .filter(opt => opt.title.toLowerCase().includes(paletteSearch.toLowerCase()))
                .map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setView(opt.view);
                      setShowPalette(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-gray-300 hover:bg-white/5 rounded-xl font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>{opt.title}</span>
                    <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-gray-500">Enter ⏎</kbd>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Alerts System */}
      <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl flex items-center justify-between gap-4 pointer-events-auto animate-slide-left min-w-[280px] max-w-sm ${
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" :
              toast.type === "error" ? "bg-rose-950/90 border-rose-500/30 text-rose-200" :
              toast.type === "warning" ? "bg-yellow-950/90 border-yellow-500/30 text-yellow-200" :
              "bg-indigo-950/90 border-indigo-500/30 text-indigo-200"
            }`}
          >
            <span className="text-xs font-semibold">{toast.message}</span>
            <button 
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-400 hover:text-white shrink-0"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Tab Bar */}
      {user && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-navy-950/95 border-t border-white/10 backdrop-blur-xl z-30 py-2.5 px-6 flex justify-around items-center">
          <button 
            onClick={() => setView("dashboard")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${view === "dashboard" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <FiCpu className="text-lg" />
            <span className="text-[10px] tracking-wide">Home</span>
          </button>
          
          <button 
            onClick={() => setView("resume")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${view === "resume" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <FiFileText className="text-lg" />
            <span className="text-[10px] tracking-wide">Practice</span>
          </button>

          <button 
            onClick={() => setView("question-bank")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${view === "question-bank" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <FiBookOpen className="text-lg" />
            <span className="text-[10px] tracking-wide">Questions</span>
          </button>

          <button 
            onClick={() => setView("profile")}
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${view === "profile" ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <FiUser className="text-lg" />
            <span className="text-[10px] tracking-wide">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}
