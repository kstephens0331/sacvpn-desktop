/**
 * Manual WireGuard Configuration
 * Allows users to paste or import a WireGuard config file directly
 */

import { useState } from "react";
import { FileText, Upload, Wifi } from "lucide-react";
import { parseWireGuardConfig, connectVpn } from "../services/wireguard";
import { useVPNStore } from "../stores/vpnStore";

export default function ManualConfig() {
  const [configText, setConfigText] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileImport = async () => {
    try {
      // Create file input element
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".conf";

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          setConfigText(text);
          setError(null);
          setSuccess(false);
        }
      };

      input.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file");
    }
  };

  const handleConnect = async () => {
    if (!configText.trim()) {
      setError("Please enter or import a WireGuard configuration");
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccess(false);

    try {
      // Parse the config
      const vpnConfig = parseWireGuardConfig(configText);

      // Connect using the config
      await connectVpn("manual", vpnConfig);

      // Update store
      useVPNStore.setState({
        wgConfig: configText,
        status: "connected",
        currentServer: {
          id: "manual",
          name: "Manual Configuration",
          ip: vpnConfig.peer.endpoint.split(":")[0],
          load: 0,
          region: "Custom",
          isFavorite: false,
          isRecommended: false,
        },
      });

      setSuccess(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setSuccess(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Manual Configuration
        </h2>
        <p className="text-gray-600 mt-2">
          Import or paste your WireGuard configuration file
        </p>
      </div>

      {/* Config Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WireGuard Configuration
          </label>
          <textarea
            value={configText}
            onChange={(e) => {
              setConfigText(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            placeholder="Paste your WireGuard configuration here...

[Interface]
PrivateKey = ...
Address = ...
DNS = ...

[Peer]
PublicKey = ...
Endpoint = ...
AllowedIPs = ..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Import Button */}
        <button
          onClick={handleFileImport}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import .conf File
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">Successfully connected!</p>
        </div>
      )}

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={isConnecting || !configText.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wifi className="w-5 h-5" />
        {isConnecting ? "Connecting..." : "Connect with This Config"}
      </button>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
          <li>Get your WireGuard configuration from your client portal</li>
          <li>Either paste it in the text area above or import a .conf file</li>
          <li>Click "Connect with This Config" to establish the VPN connection</li>
        </ol>
      </div>
    </div>
  );
}
