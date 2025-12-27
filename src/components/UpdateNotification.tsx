import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, AlertCircle } from "lucide-react";
import { checkForUpdates, downloadAndInstall, UpdateInfo } from "../services/updater";

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const info = await checkForUpdates();
        if (info.available) {
          setUpdateInfo(info);
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    };

    // Check for updates after 5 seconds (to not interfere with startup)
    const timer = setTimeout(checkUpdates, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      await downloadAndInstall();
      // App will relaunch automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to install update");
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!updateInfo?.available || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 w-96"
      >
        <div className="bg-gradient-to-br from-brand-500 to-accent-cyan rounded-xl shadow-2xl p-5 border border-white/10">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Update Available</h3>
                <p className="text-white/80 text-sm">Version {updateInfo.latestVersion}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Release Notes */}
          {updateInfo.body && (
            <div className="mb-4 p-3 rounded-lg bg-black/20 text-white/90 text-sm max-h-32 overflow-y-auto">
              {updateInfo.body}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-100 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 py-2.5 px-4 rounded-lg bg-white text-brand-600 font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install Now</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isInstalling}
              className="px-4 py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              Later
            </button>
          </div>

          {/* Info */}
          <p className="mt-3 text-xs text-white/60 text-center">
            The app will restart automatically after installation
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
