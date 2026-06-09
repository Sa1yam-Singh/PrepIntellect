import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiStar, FiFilter, FiCheck, FiPlay, FiBookOpen } from "react-icons/fi";
import { motion } from "framer-motion";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

export default function QuestionBank({ user, onStartPractice, addToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(user?.savedQuestions || []);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Sorting
  const [sortBy, setSortBy] = useState("default"); // default, difficulty, company, text

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await API.get("/questions/bank");
        setQuestions(res.data);
      } catch (err) {
        console.error("Failed to load questions from bank", err);
        addToast("Failed to connect to question bank.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  // Fetch updated user to sync saved state if changed
  useEffect(() => {
    if (user?.email) {
      API.get(`/users/${encodeURIComponent(user.email)}`)
        .then((res) => {
          setSavedIds(res.data.savedQuestions || []);
        })
        .catch(() => {});
    }
  }, [user?.email]);

  const handleToggleSave = async (questionId) => {
    if (!user?.email) {
      addToast("Please sign in to save questions.", "warning");
      return;
    }

    try {
      const res = await API.post("/questions/save", {
        email: user.email,
        questionId
      });
      setSavedIds(res.data.savedQuestions);
      if (res.data.isSaved) {
        addToast("Question bookmarked!", "success");
      } else {
        addToast("Bookmark removed.", "info");
      }
    } catch (err) {
      addToast("Failed to save question.", "error");
    }
  };

  // Filter list
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search text
      if (search.trim() && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.company.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Role filter
      if (selectedRole !== "All" && q.role !== "All Roles" && q.role !== selectedRole) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "All" && q.category !== selectedCategory) {
        return false;
      }
      // Difficulty filter
      if (selectedDifficulty !== "All" && q.difficulty !== selectedDifficulty) {
        return false;
      }
      // Company filter
      if (selectedCompany !== "All" && q.company !== selectedCompany) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "All") {
        const isSaved = savedIds.includes(q.id);
        if (selectedStatus === "Saved" && !isSaved) return false;
        if (selectedStatus === "Unsaved" && isSaved) return false;
      }
      return true;
    });
  }, [questions, search, selectedRole, selectedCategory, selectedDifficulty, selectedCompany, selectedStatus, savedIds]);

  // Sort list
  const sortedQuestions = useMemo(() => {
    const list = [...filteredQuestions];
    if (sortBy === "difficulty") {
      const order = { Easy: 1, Medium: 2, Hard: 3 };
      list.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
    } else if (sortBy === "company") {
      list.sort((a, b) => a.company.localeCompare(b.company));
    } else if (sortBy === "text") {
      list.sort((a, b) => a.question.localeCompare(b.question));
    }
    return list;
  }, [filteredQuestions, sortBy]);

  const uniqueCompanies = ["All", "Google", "Amazon", "Meta", "Netflix", "Microsoft", "Stripe", "Uber", "Airbnb"];
  const roles = ["All", "SWE", "PM", "Data", "Design"];
  const categories = ["All", "Behavioral", "Technical", "Role-specific"];
  const difficulties = ["All", "Easy", "Medium", "Hard"];
  const statuses = ["All", "Saved", "Unsaved"];

  const getDifficultyBadge = (difficulty) => {
    if (difficulty === "Easy") return "badge-emerald";
    if (difficulty === "Medium") return "badge-yellow";
    return "badge-rose";
  };

  return (
    <div className="py-6 space-y-6 animate-fade-in relative">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Practice <span className="text-gradient">Question Bank</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">Browse curated questions by company, difficulty, and practice tracks.</p>
        </div>
        
        {/* Full-text search and sort */}
        <div className="flex gap-3 max-w-lg w-full">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search questions or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="auth-input pl-10 pr-4 py-2.5 h-11"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="auth-input max-w-[130px] h-11 bg-navy-950 font-semibold text-xs border border-white/10"
          >
            <option value="default">Sort by</option>
            <option value="difficulty">Difficulty</option>
            <option value="company">Company</option>
            <option value="text">Alphabetical</option>
          </select>
          
          {/* Mobile Filter Toggle */}
          <button 
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
            title="Filters"
          >
            <FiFilter />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-8 items-start">
        
        {/* ── Left Sidebar Filters (Desktop) ── */}
        <div className="hidden md:block glass-card p-6 space-y-5 sticky top-24">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <FiFilter /> Filter Questions
          </h3>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Role</label>
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-2 py-1 rounded text-xs transition ${
                    selectedRole === r 
                      ? "bg-indigo-600 text-white font-bold" 
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="auth-input py-1.5 px-2.5 text-xs bg-navy-950"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Difficulty</label>
            <div className="flex flex-wrap gap-1">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`px-2 py-1 rounded text-xs transition ${
                    selectedDifficulty === d 
                      ? "bg-cyan-600 text-white font-bold" 
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="auth-input py-1.5 px-2.5 text-xs bg-navy-950"
            >
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status (Saved) */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status</label>
            <div className="flex gap-1.5">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`flex-1 py-1 rounded text-xs transition ${
                    selectedStatus === s 
                      ? "bg-purple-600 text-white font-bold" 
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Question List (3/4 grid) ── */}
        <div className="md:col-span-3 space-y-4">
          {loading ? (
            /* Loading shimmer skeleton */
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-5 space-y-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                  <div className="flex gap-2">
                    <div className="h-4 w-12 bg-white/5 rounded-full" />
                    <div className="h-4 w-16 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-4 w-[80%] bg-white/5 rounded-full" />
                </div>
              ))}
            </div>
          ) : sortedQuestions.length > 0 ? (
            sortedQuestions.map((q) => {
              const isSaved = savedIds.includes(q.id);
              return (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-hover p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-500/20 group relative"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${getDifficultyBadge(q.difficulty)} text-[9px] font-extrabold`}>
                        {q.difficulty}
                      </span>
                      <span className="badge-purple text-[9px] font-extrabold">
                        {q.category}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        {q.company}
                      </span>
                      <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider">
                        • {q.role === "All Roles" ? "All Tracks" : q.role}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleToggleSave(q.id)}
                      className={`p-2.5 rounded-xl border transition duration-300 flex items-center justify-center ${
                        isSaved 
                          ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20" 
                          : "border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
                      }`}
                      title={isSaved ? "Remove Bookmark" : "Save Question"}
                    >
                      <FiStar className={`text-base ${isSaved ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => onStartPractice(q.question)}
                      className="btn-primary py-2 px-4 text-xs font-bold flex-grow sm:flex-grow-0 flex items-center gap-1.5"
                    >
                      Practice <FiPlay className="text-[10px]" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            /* Empty State: No results */
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
                <FiBookOpen className="text-xl" />
              </div>
              <h4 className="text-lg font-bold text-white">No questions match filters</h4>
              <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">Try loosening your category, difficulty, or search term criteria above to explore other prep items.</p>
              <button 
                onClick={() => {
                  setSelectedRole("All");
                  setSelectedCategory("All");
                  setSelectedDifficulty("All");
                  setSelectedCompany("All");
                  setSelectedStatus("All");
                  setSearch("");
                }} 
                className="btn-secondary py-2 px-4 text-xs font-bold mt-5"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Mobile Filters Drawer (Overlay) ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          {/* Drawer content */}
          <div className="relative w-80 max-w-xs h-full bg-navy-950 p-6 flex flex-col gap-6 overflow-y-auto border-l border-white/10 shadow-2xl z-10 animate-slide-left text-left">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                <FiFilter /> Filters
              </h3>
              <button 
                onClick={() => setMobileFiltersOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                Close
              </button>
            </div>

            {/* Filters selectors list */}
            <div className="space-y-5 flex-1">
              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Role</label>
                <div className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className={`px-2 py-1 rounded text-xs transition ${
                        selectedRole === r ? "bg-indigo-600 text-white font-bold" : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="auth-input py-1.5 px-2.5 text-xs bg-navy-900 border-white/10"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Difficulty</label>
                <div className="flex flex-wrap gap-1">
                  {difficulties.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDifficulty(d)}
                      className={`px-2 py-1 rounded text-xs transition ${
                        selectedDifficulty === d ? "bg-cyan-600 text-white font-bold" : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Company</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="auth-input py-1.5 px-2.5 text-xs bg-navy-900 border-white/10"
                >
                  {uniqueCompanies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status</label>
                <div className="flex gap-1.5">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      className={`flex-1 py-1 rounded text-xs transition ${
                        selectedStatus === s ? "bg-purple-600 text-white font-bold" : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-primary w-full py-3 mt-auto text-xs"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
