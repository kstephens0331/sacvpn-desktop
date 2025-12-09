import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Wifi,
  Globe,
  Monitor,
  Lock,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useVPNStore } from "../stores/vpnStore";
import * as tauriService from "../services/tauri";

export default function SettingsPanel() {
  const {
    autoConnect,
    killSwitch,
    splitTunneling,
    customDns,
    showNotifications,
    setAutoConnect,
    setKillSwitch,
    setSplitTunneling,
    setCustomDns,
    setShowNotifications,
  } = useVPNStore();

  const [dnsInput, setDnsInput] = useState(customDns);
  const [launchAtStartup, setLaunchAtStartup] = useState(false);

  // Check autostart status on mount
  useEffect(() => {
    tauriService.isAutostartEnabled().then(setLaunchAtStartup);
  }, []);

  const handleDnsBlur = () => {
    setCustomDns(dnsInput);
  };

  const handleLaunchAtStartupToggle = async () => {
    const newValue = !launchAtStartup;
    const success = await tauriService.toggleAutostart(newValue);
    if (success) {
      setLaunchAtStartup(newValue);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-surface-400">
          Configure your VPN preferences and security options
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Connection Settings */}
        <SettingsSection title="Connection" icon={Wifi}>
          <SettingToggle
            title="Auto-connect on startup"
            description="Automatically connect to VPN when the app starts"
            enabled={autoConnect}
            onToggle={() => setAutoConnect(!autoConnect)}
          />
          <SettingToggle
            title="Auto-connect on untrusted networks"
            description="Connect automatically when joining public WiFi"
            enabled={false}
            onToggle={() => {}}
            disabled
            badge="Coming Soon"
          />
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection title="Security" icon={Shield}>
          <SettingToggle
            title="Kill Switch"
            description="Block internet if VPN connection drops unexpectedly"
            enabled={killSwitch}
            onToggle={() => setKillSwitch(!killSwitch)}
            important
          />
          <SettingToggle
            title="DNS Leak Protection"
            description="Prevent DNS queries from leaking outside the VPN tunnel"
            enabled={true}
            onToggle={() => {}}
            locked
          />
          <SettingToggle
            title="IPv6 Leak Protection"
            description="Block IPv6 traffic to prevent leaks"
            enabled={true}
            onToggle={() => {}}
            locked
          />
        </SettingsSection>

        {/* Network Settings */}
        <SettingsSection title="Network" icon={Globe}>
          <SettingToggle
            title="Split Tunneling"
            description="Choose which apps use the VPN connection"
            enabled={splitTunneling}
            onToggle={() => setSplitTunneling(!splitTunneling)}
          />
          {splitTunneling && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="ml-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700"
            >
              <p className="text-surface-400 text-sm mb-3">
                Select apps to exclude from VPN:
              </p>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors text-sm">
                <Layers className="w-4 h-4" />
                Configure Apps
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="py-4 border-t border-surface-800">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-medium">Custom DNS</h4>
                <p className="text-surface-400 text-sm">
                  Use a custom DNS server (leave empty for default)
                </p>
              </div>
            </div>
            <input
              type="text"
              value={dnsInput}
              onChange={(e) => setDnsInput(e.target.value)}
              onBlur={handleDnsBlur}
              placeholder="e.g., 1.1.1.1 or 8.8.8.8"
              className="w-full h-11 px-4 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </SettingsSection>

        {/* Protocol Settings */}
        <SettingsSection title="Protocol" icon={Zap}>
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-medium">VPN Protocol</h4>
                <p className="text-surface-400 text-sm">
                  WireGuard provides the best balance of speed and security
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ProtocolOption
                name="WireGuard"
                description="Fastest & most secure"
                selected={true}
              />
              <ProtocolOption
                name="OpenVPN"
                description="Legacy support"
                selected={false}
                disabled
                comingSoon
              />
            </div>
          </div>
        </SettingsSection>

        {/* App Settings */}
        <SettingsSection title="Application" icon={Monitor}>
          <SettingToggle
            title="Launch at startup"
            description="Start SACVPN when your computer boots"
            enabled={launchAtStartup}
            onToggle={handleLaunchAtStartupToggle}
          />
          <SettingToggle
            title="Minimize to system tray"
            description="Keep running in the background when closed"
            enabled={true}
            onToggle={() => {}}
            locked
          />
          <SettingToggle
            title="Show notifications"
            description="Get notified about connection status changes"
            enabled={showNotifications}
            onToggle={() => setShowNotifications(!showNotifications)}
          />
        </SettingsSection>

        {/* About */}
        <div className="rounded-2xl bg-surface-850 border border-surface-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                SACVPN Desktop
              </h3>
              <p className="text-surface-400 text-sm">
                Version 1.0.0 • WireGuard Protocol
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors text-sm">
              Check for Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function SettingsSection({ title, icon: Icon, children }: SettingsSectionProps) {
  return (
    <div className="rounded-2xl bg-surface-850 border border-surface-700 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-surface-700">
        <div className="p-2 rounded-lg bg-brand-500/20">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-1">{children}</div>
    </div>
  );
}

interface SettingToggleProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  important?: boolean;
  locked?: boolean;
  disabled?: boolean;
  badge?: string;
}

function SettingToggle({
  title,
  description,
  enabled,
  onToggle,
  important,
  locked,
  disabled,
  badge,
}: SettingToggleProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 border-b border-surface-800 last:border-b-0 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 mr-4">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium">{title}</h4>
          {important && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              Recommended
            </span>
          )}
          {locked && (
            <Lock className="w-4 h-4 text-surface-500" />
          )}
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-surface-700 text-surface-400 text-xs">
              {badge}
            </span>
          )}
        </div>
        <p className="text-surface-400 text-sm mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={locked || disabled}
        className={`relative flex-shrink-0 ${locked || disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {enabled ? (
          <ToggleRight className="w-10 h-10 text-brand-500" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-surface-600" />
        )}
      </button>
    </div>
  );
}

interface ProtocolOptionProps {
  name: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}

function ProtocolOption({
  name,
  description,
  selected,
  disabled,
  comingSoon,
}: ProtocolOptionProps) {
  return (
    <button
      disabled={disabled}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? "border-brand-500 bg-brand-500/10"
          : disabled
          ? "border-surface-700 bg-surface-800/50 opacity-50 cursor-not-allowed"
          : "border-surface-700 bg-surface-800 hover:border-surface-600"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-white">{name}</span>
        {selected && (
          <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
        )}
        {comingSoon && (
          <span className="text-xs text-surface-500">Soon</span>
        )}
      </div>
      <p className="text-surface-400 text-sm">{description}</p>
    </button>
  );
}
