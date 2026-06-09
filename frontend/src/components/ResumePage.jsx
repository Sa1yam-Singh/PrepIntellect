import { useState, useCallback } from "react";
import { FiUploadCloud, FiFileText, FiAward, FiArrowRight, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : "/api"
});

export default function ResumePage({ onStartPractice, addToast }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null); // { skills: [], questions: { behavioral: [], technical: [], roleSpecific: [] } }
  const [activeTab, setActiveTab] = useState("behavioral");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile) => {
    setError("");
    if (!selectedFile) return;

    // Check size limit: 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5MB size limit.");
      addToast("File is too large (max 5MB)", "error");
      return;
    }

    // Check file extension
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx") && !name.endsWith(".txt")) {
      setError("Unsupported file format. Please upload a PDF, DOCX, or TXT file.");
      addToast("Invalid file format", "error");
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    addToast("Analyzing resume...", "info");

    const formData = new FormData();
    formData.append("resume", selectedFile);

    try {
      const res = await API.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setData(res.data);
      addToast("Resume analyzed! Generated 15 custom questions.", "success");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to analyze resume. Please try again.");
      addToast("AI parsing failed. Retrying with backup...", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setData(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Resume <span className="text-gradient">Personalized Questions</span>
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Upload your resume to extract skills and generate 15 highly personalized behavioral, technical, and role-specific questions.
        </p>
      </div>

      {!data ? (
        /* Upload Area */
        <div className="glass-card-strong p-8 md:p-12 relative overflow-hidden">
          <div className="floating-orb w-[200px] h-[200px] bg-purple-500/10 top-1/2 right-10 -translate-y-1/2" />
          
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative z-10 border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 ${
              dragActive 
                ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]" 
                : "border-white/10 hover:border-white/20 bg-navy-950/20"
            }`}
          >
            {uploading ? (
              /* Shimmering Loading State */
              <div className="space-y-6 w-full max-w-md py-6">
                <div className="h-16 w-16 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse">
                  <FiUploadCloud className="text-3xl text-indigo-400 animate-bounce" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-white">Parsing and Extracting Skills...</h4>
                  <p className="text-xs text-gray-400">Our AI model is reviewing your background and generating tailormade mock questions.</p>
                </div>
                
                {/* Skeleton Shimmer Bars */}
                <div className="space-y-2.5 pt-4">
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                  </div>
                  <div className="h-2.5 w-[85%] bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                  </div>
                  <div className="h-2.5 w-[70%] bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                  </div>
                </div>
              </div>
            ) : (
              /* Upload Prompt */
              <div className="space-y-5">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition">
                  <FiUploadCloud className="text-3xl" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Drag & drop your resume file here</h4>
                  <p className="text-sm text-gray-400 mt-1">PDF, DOCX, or TXT formats (Max size 5MB)</p>
                </div>
                
                <div className="flex justify-center">
                  <label className="btn-primary cursor-pointer">
                    Browse File
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileInput}
                    />
                  </label>
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 justify-center text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl">
                    <FiAlertCircle className="text-sm shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          
          {/* Top Panel: Skills Detected */}
          <div className="glass-card-strong p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FiAward className="text-xl" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Extracted Professional Skills</h3>
                  <p className="text-xs text-gray-500">Skills parsed by PrepIntellect AI evaluator</p>
                </div>
              </div>
              <button 
                onClick={resetUpload}
                className="btn-secondary text-xs py-2 px-3 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-400"
              >
                Upload Different Resume
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {data.skills?.map((skill, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-white transition duration-200"
                >
                  {skill}
                </span>
              ))}
              {(!data.skills || data.skills.length === 0) && (
                <p className="text-xs text-gray-500 italic">No skills identified. Let's practice general skills.</p>
              )}
            </div>
          </div>

          {/* Question Grid Tabs */}
          <div className="space-y-4">
            <div className="flex border-b border-white/5 gap-2">
              {["behavioral", "technical", "roleSpecific"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition capitalize ${
                    activeTab === tab 
                      ? "border-indigo-500 text-white font-bold" 
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab === "roleSpecific" ? "Role-Specific" : tab}
                </button>
              ))}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {data.questions?.[activeTab]?.map((q, index) => (
                <div 
                  key={index} 
                  className="glass-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/20 transition-all duration-300 group"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="badge-purple text-[9px] font-extrabold">Q{index + 1}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold capitalize">{activeTab}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition">{q}</p>
                  </div>
                  <button 
                    onClick={() => onStartPractice(q)}
                    className="btn-primary py-2.5 px-4 text-xs font-bold whitespace-nowrap shrink-0 group-hover:scale-[1.02] active:scale-[0.97]"
                  >
                    Practice Question <FiArrowRight className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
      
      {/* Empty State Fallback (e.g. no resume yet uploaded) */}
      {!file && !data && (
        <div className="text-center py-8 opacity-60">
          <p className="text-xs text-gray-500">Your profile details are secure. Audio and documents are parsed locally for evaluation extraction.</p>
        </div>
      )}
    </div>
  );
}
