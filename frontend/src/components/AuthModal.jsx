import { useState } from "react";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  updateProfile 
} from "firebase/auth";
import { FiMail, FiLock, FiUser, FiArrowRight, FiX } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

export default function AuthModal({ isOpen, onClose, initialMode = "login", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDummyFirebase = !import.meta.env.VITE_FIREBASE_API_KEY || 
    import.meta.env.VITE_FIREBASE_API_KEY.includes("dummy") || 
    import.meta.env.VITE_FIREBASE_API_KEY === "AIzaSyBcnjYeJq4Le6VSCjNaH1YYTBsh42Dh5p4";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isDummyFirebase) {
      setTimeout(() => {
        onAuthSuccess({
          name: mode === "signup" ? name : email.split("@")[0],
          email: email,
          uid: "mock-uid-" + Date.now()
        });
        onClose();
        setLoading(false);
      }, 800);
      return;
    }

    try {
      if (mode === "signup") {
        if (!name) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        onAuthSuccess({
          name: name,
          email: userCredential.user.email,
          uid: userCredential.user.uid
        });
        onClose();
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess({
          name: userCredential.user.displayName || email.split("@")[0],
          email: userCredential.user.email,
          uid: userCredential.user.uid
        });
        onClose();
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerName) => {
    setLoading(true);
    setError("");

    // Use mock popup flow only when running with dummy Firebase credentials
    if (isDummyFirebase) {
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popupUrl = `/${providerName.toLowerCase()}-mock-login.html`;
      const popup = window.open(
        popupUrl,
        `${providerName} Login`,
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        setError("Popup blocked! Please allow popups for this website.");
        setLoading(false);
        return;
      }

      const handleAuthMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === "MOCK_AUTH_SUCCESS" && event.data?.provider === providerName) {
          window.removeEventListener("message", handleAuthMessage);
          onAuthSuccess({
            name: event.data.user.name,
            email: event.data.user.email,
            uid: event.data.user.uid
          });
          onClose();
          setLoading(false);
        }
      };

      window.addEventListener("message", handleAuthMessage);

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener("message", handleAuthMessage);
          setLoading(false);
        }
      }, 1000);
      
      return;
    }

    // Real Firebase authentication
    try {
      let provider;
      if (providerName === "Google") {
        provider = new GoogleAuthProvider();
      } else if (providerName === "GitHub") {
        provider = new GithubAuthProvider();
        provider.addScope("read:user");
        provider.addScope("user:email");
      } else {
        throw new Error(`Unsupported provider: ${providerName}`);
      }

      const userCredential = await signInWithPopup(auth, provider);
      onAuthSuccess({
        name: userCredential.user.displayName || providerName + " User",
        email: userCredential.user.email,
        uid: userCredential.user.uid
      });
      onClose();
    } catch (err) {
      // Provide user-friendly error messages for common Firebase auth errors
      const code = err.code || "";
      if (code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with the same email but a different sign-in method. Try logging in with Google or email instead.");
      } else if (code === "auth/popup-closed-by-user") {
        setError(""); // User cancelled, no error needed
      } else if (code === "auth/popup-blocked") {
        setError("Popup was blocked by your browser. Please allow popups for this website.");
      } else if (code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase. Add it under Authentication > Settings > Authorized domains.");
      } else {
        setError(err.message || "Social authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-navy-950/90 p-8 shadow-2xl backdrop-blur-xl animate-scale-in">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition"
        >
          <FiX className="text-lg" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-gray-400">
            {mode === "login" 
              ? "Sign in to continue your interview prep" 
              : "Sign up to begin your personalized path to success"
            }
          </p>
        </div>

        {/* Social Logins */}
        <div className="space-y-3 mb-6">
          <button 
            onClick={() => handleSocialLogin("Google")}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
          >
            <FcGoogle className="text-lg" />
            Continue with Google
          </button>

          <button 
            onClick={() => handleSocialLogin("GitHub")}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
          >
            <FaGithub className="text-lg" />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute w-full border-t border-white/10" />
          <span className="relative bg-navy-950 px-3 text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Or email details
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute top-3.5 left-4 text-gray-500" />
                <input 
                  type="text"
                  required
                  placeholder="Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input pl-11"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute top-3.5 left-4 text-gray-500" />
              <input 
                type="email"
                required
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input pl-11"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute top-3.5 left-4 text-gray-500" />
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input pl-11"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-400 text-center bg-rose-500/15 border border-rose-500/20 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                {mode === "login" ? "Login" : "Sign Up"}
                <FiArrowRight />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <p className="mt-6 text-center text-xs text-gray-400">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-bold text-indigo-400 hover:underline hover:text-indigo-300"
          >
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </p>

      </div>
    </div>
  );
}
