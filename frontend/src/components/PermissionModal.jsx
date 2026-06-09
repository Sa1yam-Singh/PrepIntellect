import { FiX, FiAlertTriangle, FiSmartphone, FiHelpCircle, FiRefreshCw, FiArrowRight } from "react-icons/fi";

export default function PermissionModal({ isOpen, onClose, onRetry, type = "microphone", errorMsg = "" }) {
  if (!isOpen) return null;

  const isAndroid = /Android/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-navy-950/90 p-6 shadow-2xl backdrop-blur-xl animate-scale-in text-white">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition"
        >
          <FiX className="text-lg" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <FiAlertTriangle className="text-2xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              {type === "both" ? "Camera & Microphone Access Blocked" : `${type.charAt(0).toUpperCase() + type.slice(1)} Access Blocked`}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Your browser was unable to start the {type === "both" ? "camera or microphone" : type}. 
              {errorMsg && <code className="block mt-1 font-mono text-[10px] text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">Error: {errorMsg}</code>}
            </p>
          </div>
        </div>

        {/* Content Tabs/Sections */}
        <div className="space-y-5">
          
          {/* Android Specific Help */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <FiSmartphone className="text-lg" />
              <h4>Android Users: Screen Overlay Block</h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              If your phone says <strong>"Close other apps bubbles overlay and try again"</strong> or <strong>"Screen overlay detected"</strong>, Android is blocking permissions to protect your privacy. This happens when a floating app is currently active on your screen.
            </p>
            
            <div className="space-y-2 border-t border-indigo-500/10 pt-2 text-xs text-gray-400">
              <div className="flex gap-2">
                <span className="font-bold text-indigo-400">1.</span>
                <span><strong>Close Floating Bubbles:</strong> Drag active chat heads (like Facebook Messenger), floating widgets, screen recorders, or blue-light filter apps (Twilight, etc.) to the <strong>"X"</strong> to close them.</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-indigo-400">2.</span>
                <span><strong>Disable Special Access:</strong> If the issue persists, go to your phone's <strong>Settings &gt; Apps &gt; Special Access &gt; Display over other apps</strong> and temporarily toggle off permission for floating apps.</span>
              </div>
            </div>
          </div>

          {/* Browser / Permissions Guide */}
          <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
              <FiHelpCircle className="text-lg" />
              <h4>Browser Permissions Guide</h4>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-gray-300">
              <li>
                Click the <strong>lock icon (🔒)</strong> in the address bar next to the website URL.
              </li>
              <li>
                Make sure <strong>{type === "both" ? "Camera and Microphone" : type.charAt(0).toUpperCase() + type.slice(1)}</strong> permission is set to <strong>Allow</strong>.
              </li>
              <li>
                Ensure no other tab is currently using your {type}.
              </li>
            </ul>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={() => {
              onRetry();
              onClose();
            }}
            className="flex-grow flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 text-sm transition active:scale-[0.98] shadow-lg shadow-cyan-600/20"
          >
            <FiRefreshCw className="text-xs animate-spin-reverse" />
            Retry Access
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-semibold transition active:scale-[0.98]"
          >
            Reload Page
          </button>

          <button
            onClick={onClose}
            className="rounded-xl text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 text-sm font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
