import { useState, useEffect } from "react";
import { FiCalendar, FiClock, FiUser, FiPlus, FiTrash2, FiUserCheck, FiSend } from "react-icons/fi";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulerPage({ user, addToast, onBack }) {
  const [availability, setAvailability] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);

  // New Slot Input State
  const [newDay, setNewDay] = useState("Monday");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");

  useEffect(() => {
    if (user?.email) {
      loadProfileAndMatches();
    }
  }, [user?.email]);

  const loadProfileAndMatches = async () => {
    setLoadingMatches(true);
    try {
      // Load current user's profile to get their saved availability
      const profileRes = await API.get(`/users/${encodeURIComponent(user.email)}`);
      setAvailability(profileRes.data.availability || []);

      // Load matching peers
      const matchesRes = await API.get(`/scheduler/matches?email=${encodeURIComponent(user.email)}`);
      setMatches(matchesRes.data || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to load scheduler details.", "error");
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAddSlot = () => {
    // Basic overlap check
    const exists = availability.some(
      slot => slot.dayOfWeek === newDay && slot.startTime === newStart && slot.endTime === newEnd
    );
    if (exists) {
      addToast("This time slot already exists.", "warning");
      return;
    }

    setAvailability(prev => [...prev, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }]);
  };

  const handleRemoveSlot = (index) => {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAvailability = async () => {
    setSavingAvail(true);
    try {
      await API.post("/scheduler/availability", {
        email: user.email,
        availability
      });
      addToast("Availability saved successfully!", "success");
      // Reload matches in case saving availability creates new overlap context
      loadProfileAndMatches();
    } catch (err) {
      console.error(err);
      addToast("Failed to save availability.", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  const handleBookSession = async (peer, slot) => {
    addToast(`Booking session with ${peer.name}...`, "info");
    try {
      const res = await API.post("/scheduler/book", {
        email: user.email,
        peerEmail: peer.email,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
      addToast(res.data.message || "Session booked! Calendar invite dispatched.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to book session. Please try again.", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 animate-fade-in relative z-10">
      
      {/* Header */}
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
          Peer Match <span className="text-gradient">Scheduler</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">Set your availability and book cooperative mock interviews with peers preparing for the same track.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start">
        
        {/* Left Side: Availability Management (2/5 grid) */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card-strong p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <FiClock className="text-indigo-400" />
              My Mock Availability
            </h3>

            {/* Add New Slot Panel */}
            <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-xl">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Day</label>
                <select 
                  value={newDay} 
                  onChange={(e) => setNewDay(e.target.value)}
                  className="bg-navy-950 border border-white/10 text-xs rounded-lg w-full p-2 mt-1 outline-none text-white"
                >
                  {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Start Time</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="bg-navy-950 border border-white/10 text-xs rounded-lg w-full p-2 mt-1 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">End Time</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="bg-navy-950 border border-white/10 text-xs rounded-lg w-full p-2 mt-1 outline-none text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleAddSlot}
                className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-300"
              >
                <FiPlus /> Add Slot
              </button>
            </div>

            {/* Configured Slots List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {availability.map((slot, index) => (
                <div key={index} className="flex justify-between items-center bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-200 block">{slot.dayOfWeek}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{slot.startTime} - {slot.endTime}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveSlot(index)}
                    className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove Slot"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              {availability.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-4">No availability slots configured.</p>
              )}
            </div>

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvail}
              className="btn-primary w-full py-3 text-xs font-bold"
            >
              {savingAvail ? "Saving Changes..." : "Save My Availability"}
            </button>
          </div>
        </div>

        {/* Right Side: Matched Peers (3/5 grid) */}
        <div className="md:col-span-3 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <FiUserCheck className="text-indigo-400" />
              Available Peer Matches
            </h3>

            {loadingMatches ? (
              <div className="text-center py-10">
                <div className="h-8 w-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">Searching active peer tracks...</p>
              </div>
            ) : matches.length > 0 ? (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {matches.map((peer, pIdx) => (
                  <div key={pIdx} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3 hover:border-white/10 transition-all duration-300">
                    
                    {/* Peer Profile Summary */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <FiUser />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{peer.name}</h4>
                          <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold block">{peer.targetRole}</span>
                        </div>
                      </div>
                      <span className="badge-purple text-[8px] font-extrabold">{peer.category} track</span>
                    </div>

                    {/* Peer Availability slots */}
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Select Slot to Book:</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {peer.availability?.map((slot, sIdx) => (
                          <div 
                            key={sIdx} 
                            onClick={() => handleBookSession(peer, slot)}
                            className="bg-navy-950/40 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-white px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition group"
                          >
                            <div className="space-y-0.5 text-left">
                              <span className="text-[11px] font-bold text-gray-200 block group-hover:text-indigo-400 transition">{slot.dayOfWeek}</span>
                              <span className="text-[10px] text-gray-500 font-medium">{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <FiSend className="text-xs text-gray-500 group-hover:text-indigo-400 transition shrink-0 ml-2" />
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 opacity-60">
                <FiCalendar className="text-3xl text-gray-500 mb-3 mx-auto" />
                <h4 className="text-sm font-bold text-white">No active matches found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">Ensure you have saved your availability and check back soon for candidates matching your career track.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
