import { useState, useEffect } from "react";
import { FiRefreshCw, FiBookOpen, FiChevronLeft, FiChevronRight, FiFilter } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

export default function FlashcardsPage({ user, addToast, onBack }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadCards();
    }
  }, [user?.email]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/flashcards/${encodeURIComponent(user.email)}`);
      setCards(res.data);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error(err);
      addToast("Failed to load study flashcards.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCards = async () => {
    setGenerating(true);
    addToast("Coaching AI to build cards from your weak points...", "info");
    try {
      const res = await API.post("/flashcards/generate", { email: user.email });
      setCards(res.data);
      setCurrentIndex(res.data.length - 5 >= 0 ? res.data.length - 5 : 0);
      setIsFlipped(false);
      addToast("Dynamic flashcards generated!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to generate dynamic flashcards.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCardReview = async (cardQuestion) => {
    try {
      await API.post("/flashcards/review", { email: user.email, question: cardQuestion });
      // Update local count
      setCards(prev => prev.map(c => c.question === cardQuestion ? { ...c, reviewCount: (c.reviewCount || 0) + 1 } : c));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["All", ...new Set(cards.map(c => c.category || "General"))];
  const filteredCards = selectedCategory === "All" 
    ? cards 
    : cards.filter(c => c.category === selectedCategory);

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  const handleCardFlip = () => {
    const card = filteredCards[currentIndex];
    if (!isFlipped && card) {
      handleCardReview(card.question);
    }
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6 animate-fade-in relative z-10">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold mb-2 flex items-center gap-1 bg-none border-none cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          )}
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            AI Study <span className="text-gradient">Flashcards</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">Active recall cards dynamically tailored to your mock interview results.</p>
        </div>
        
        <button
          onClick={handleGenerateCards}
          disabled={generating || loading}
          className="btn-primary py-2.5 px-4 text-xs font-bold shrink-0 flex items-center gap-1.5"
        >
          <FiRefreshCw className={generating ? "animate-spin" : ""} />
          Generate Dynamic Cards
        </button>
      </div>

      {loading ? (
        <div className="glass-card-strong p-16 text-center">
          <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-gray-400">Loading personalized cards...</p>
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="space-y-6">
          
          {/* Filters Row */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl">
            <FiFilter className="text-indigo-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="bg-transparent text-xs font-bold text-gray-300 outline-none flex-1"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-navy-950 text-white font-semibold">{cat}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-500 font-bold">
              Card {currentIndex + 1} of {filteredCards.length}
            </span>
          </div>

          {/* Flashcard container with gorgeous 3D Flip style */}
          <div 
            onClick={handleCardFlip}
            className="w-full h-80 cursor-pointer [perspective:1000px] relative group"
          >
            <div 
              className={`w-full h-full duration-500 [transform-style:preserve-3d] transition-transform relative ${
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              
              {/* CARD FRONT */}
              <div className="absolute inset-0 w-full h-full rounded-3xl glass-card-strong p-8 flex flex-col justify-between [backface-visibility:hidden] border-indigo-500/20 bg-indigo-950/10 shadow-2xl">
                <div className="flex justify-between items-start">
                  <span className="badge-purple text-[9px] font-extrabold tracking-wider">{filteredCards[currentIndex].category}</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Reviews: {filteredCards[currentIndex].reviewCount || 0}</span>
                </div>

                <div className="my-auto py-4 text-center">
                  <p className="text-lg font-bold text-white leading-relaxed pr-2">
                    {filteredCards[currentIndex].question}
                  </p>
                </div>

                <div className="text-[9px] text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">
                  Click to Flip Card
                </div>
              </div>

              {/* CARD BACK */}
              <div className="absolute inset-0 w-full h-full rounded-3xl glass-card-strong p-8 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] border-cyan-500/20 bg-cyan-950/10 shadow-2xl">
                <div className="flex justify-between items-start">
                  <span className="badge-cyan text-[9px] font-extrabold tracking-wider">{filteredCards[currentIndex].category}</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Solution Revealed</span>
                </div>

                <div className="my-auto py-4">
                  <p className="text-sm text-gray-200 leading-relaxed font-semibold">
                    {filteredCards[currentIndex].answer}
                  </p>
                </div>

                <div className="text-[9px] text-center text-gray-500 font-bold uppercase tracking-widest">
                  Click to Return
                </div>
              </div>

            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between max-w-xs mx-auto pt-2">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 transition flex items-center justify-center text-gray-400"
            >
              <FiChevronLeft className="text-lg" />
            </button>
            
            <span className="text-xs font-mono font-bold text-indigo-400 select-none">
              {(currentIndex + 1).toString().padStart(2, "0")} / {filteredCards.length.toString().padStart(2, "0")}
            </span>

            <button 
              onClick={handleNext}
              disabled={currentIndex === filteredCards.length - 1}
              className="p-3 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 transition flex items-center justify-center text-gray-400"
            >
              <FiChevronRight className="text-lg" />
            </button>
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="glass-card-strong p-12 text-center space-y-4">
          <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
            <FiBookOpen className="text-2xl" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-white">No flashcards available</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">We couldn't load any flashcards. Click the button above to dynamically compile standard flashcards for your profile.</p>
          </div>
        </div>
      )}

    </div>
  );
}
