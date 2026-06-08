import { useState, useEffect, useRef } from "react";
import { FiMenu, FiX, FiUser, FiLogOut, FiHelpCircle, FiGrid, FiChevronDown, FiSettings, FiBarChart2 } from "react-icons/fi";

export default function Header({ currentView, setView, user, onLogout, openAuthModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Scroll-based header opacity
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNavClick = (view) => {
    setView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header 
      className={`sticky top-0 z-40 w-full animated-border transition-all duration-500 ${
        scrolled 
          ? "bg-navy-950/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]" 
          : "bg-navy-950/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick(user ? "dashboard" : "landing")} 
          className="flex cursor-pointer items-center gap-3 group"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-shadow duration-300">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Prep<span className="text-gradient">Intellect</span>
            </h1>
            <p className="text-[10px] tracking-wider text-gray-500 uppercase font-semibold">AI Interview Suite</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button 
            onClick={() => handleNavClick(user ? "dashboard" : "landing")}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:text-white hover:bg-white/5 ${
              currentView === "landing" || currentView === "dashboard" 
                ? "text-indigo-400 bg-indigo-500/5" 
                : "text-gray-400"
            }`}
          >
            {user ? "Dashboard" : "Home"}
          </button>
          <button 
            onClick={() => { if (currentView !== "landing") setView("landing"); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 transition-all duration-200 hover:text-white hover:bg-white/5"
          >
            Features
          </button>
          {user && (
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:text-white hover:bg-white/5 flex items-center gap-1.5 ${
                currentView === "analytics" ? "text-cyan-400 bg-cyan-500/5" : "text-gray-400"
              }`}
            >
              <FiBarChart2 className="text-sm" /> Analytics
            </button>
          )}
        </nav>

        {/* User Auth Buttons / User Dropdown (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-300 font-bold text-sm ring-1 ring-indigo-500/20">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-200">{user.name || "User"}</p>
                  <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.email}</p>
                </div>
                <FiChevronDown className={`text-gray-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-navy-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-slide-down z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setView("dashboard"); setDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                    >
                      <FiGrid className="text-indigo-400" /> Dashboard
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                    >
                      <FiSettings className="text-gray-500" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button
                      onClick={() => { onLogout(); setDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/5 transition"
                    >
                      <FiLogOut /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button 
                onClick={() => openAuthModal("login")}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 transition-all duration-200 hover:text-white hover:bg-white/5"
              >
                Login
              </button>
              <button 
                onClick={() => openAuthModal("signup")}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign Up Free
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-gray-400 hover:text-white hover:bg-white/10 md:hidden transition-all"
        >
          {mobileMenuOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-navy-950/95 backdrop-blur-xl py-6 px-6 md:hidden animate-slide-down space-y-5">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleNavClick(user ? "dashboard" : "landing")}
              className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                currentView === "landing" || currentView === "dashboard" ? "text-indigo-400 bg-indigo-500/5" : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {user ? "Dashboard" : "Home"}
            </button>
            <button 
              onClick={() => {
                if (currentView !== "landing") setView("landing");
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 transition"
            >
              Features
            </button>
          </div>

          <div className="border-t border-white/5 pt-5">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-300 font-bold text-sm">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-rose-500/20 bg-rose-500/5 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <FiLogOut /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    openAuthModal("login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 transition"
                >
                  Login
                </button>
                <button 
                  onClick={() => {
                    openAuthModal("signup");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-glow"
                >
                  Sign Up Free
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
