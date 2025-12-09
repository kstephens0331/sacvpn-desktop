import { Clock, ArrowUp, ArrowDown } from "lucide-react";
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
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function StatusBar() {
  const { status, currentServer, connectionStats } = useVPNStore();

  const isConnected = status === "connected";
  const connectedDuration = connectionStats.connectedSince
    ? Date.now() - connectionStats.connectedSince
    : 0;

  return (
    <div className="h-8 flex items-center justify-between px-4 bg-surface-900 border-t border-surface-800 text-xs">
      {/* Left - Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-green-500 animate-pulse"
                : status === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-surface-600"
            }`}
          />
          <span className="text-surface-400">
            {isConnected
              ? `Connected to ${currentServer?.name}`
              : status === "connecting"
              ? "Connecting..."
              : "Not connected"}
          </span>
        </div>

        {isConnected && (
          <>
            <div className="flex items-center gap-1.5 text-surface-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(connectedDuration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Right - Speed Stats */}
      {isConnected && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-green-400">
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{formatSpeed(connectionStats.downloadSpeed)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{formatSpeed(connectionStats.uploadSpeed)}</span>
          </div>
          <div className="text-surface-500">
            {formatBytes(connectionStats.totalDownloaded)} /{" "}
            {formatBytes(connectionStats.totalUploaded)}
          </div>
        </div>
      )}

      {/* Right - Version (when not connected) */}
      {!isConnected && (
        <div className="text-surface-500">SACVPN v1.0.0 • WireGuard</div>
      )}
    </div>
  );
}
