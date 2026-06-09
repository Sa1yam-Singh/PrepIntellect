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
    </div>
  );
}
