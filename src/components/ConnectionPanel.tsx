import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Power,
  Wifi,
  Server,
  Activity,
  Clock,
  ArrowUp,
  ArrowDown,
  Zap,
  Lock,
} from "lucide-react";
import { useVPNStore } from "../stores/vpnStore";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Country flag emoji helper
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function ConnectionPanel() {
  const {
    status,
    currentServer,
    selectedServer,
    connectionStats,
    connect,
    disconnect,
  } = useVPNStore();

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isDisconnecting = status === "disconnecting";
  const server = currentServer || selectedServer;

  const handleToggleConnection = async () => {
    if (isConnected || isDisconnecting) {
      await disconnect();
    } else if (!isConnecting) {
      await connect();
    }
  };

  const connectedDuration = connectionStats.connectedSince
    ? Date.now() - connectionStats.connectedSince
    : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      {/* Connection Button */}
      <motion.div className="relative mb-8">
        {/* Outer glow ring */}
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 -m-4 rounded-full bg-green-500/20 animate-ping-slow"
            />
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          onClick={handleToggleConnection}
          disabled={isConnecting || isDisconnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative w-52 h-52 rounded-full transition-all duration-500 flex items-center justify-center ${
            isConnected
              ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border-4 border-green-500 shadow-[0_0_60px_rgba(34,197,94,0.4)]"
              : isConnecting
              ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-4 border-yellow-500 animate-pulse"
              : "bg-gradient-to-br from-surface-800 to-surface-900 border-4 border-surface-700 hover:border-surface-600"
          } disabled:cursor-not-allowed`}
        >
          {/* Inner circle */}
          <div
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${
              isConnected
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : isConnecting
                ? "bg-gradient-to-br from-yellow-500 to-yellow-600"
                : "bg-gradient-to-br from-surface-700 to-surface-800"
            }`}
          >
            {isConnected ? (
              <>
                <Shield className="w-14 h-14 text-white mb-1" />
                <span className="text-white font-bold text-lg">PROTECTED</span>
              </>
            ) : isConnecting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Wifi className="w-14 h-14 text-white" />
                </motion.div>
                <span className="text-white font-semibold mt-2">
                  Connecting...
                </span>
              </>
            ) : (
              <>
                <Power className="w-14 h-14 text-surface-400 mb-1" />
                <span className="text-surface-400 font-semibold">
                  TAP TO CONNECT
                </span>
              </>
            )}
          </div>
        </motion.button>
      </motion.div>

      {/* Server Info */}
      {server && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">{getCountryFlag(server.countryCode)}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{server.city}</h2>
              <p className="text-surface-400">{server.country}</p>
            </div>
          </div>

          {!isConnected && (
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-surface-400">
              <span className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                {server.load}% load
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {server.latency}ms
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Connection Stats (when connected) */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-2xl"
          >
            <StatCard
              icon={Clock}
              label="Duration"
              value={formatDuration(connectedDuration)}
              iconColor="text-brand-400"
            />
            <StatCard
              icon={ArrowDown}
              label="Download"
              value={formatSpeed(connectionStats.downloadSpeed)}
              iconColor="text-green-400"
            />
            <StatCard
              icon={ArrowUp}
              label="Upload"
              value={formatSpeed(connectionStats.uploadSpeed)}
              iconColor="text-blue-400"
            />
            <StatCard
              icon={Server}
              label="Total Data"
              value={formatBytes(
                connectionStats.totalDownloaded + connectionStats.totalUploaded
              )}
              iconColor="text-accent-purple"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Info (when connected) */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 flex items-center gap-6 text-sm"
          >
            <div className="flex items-center gap-2 text-green-400">
              <Lock className="w-4 h-4" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="w-4 h-4" />
              <span>No DNS Leaks</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Zap className="w-4 h-4" />
              <span>WireGuard Protocol</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions (when disconnected) */}
      {!isConnected && !isConnecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 mt-4"
        >
          <div className="px-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700 text-surface-400 text-sm">
            <span className="text-green-400 font-semibold">WireGuard</span> • Fastest Protocol
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, iconColor }: StatCardProps) {
  return (
    <div className="stats-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-surface-400 text-sm">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
