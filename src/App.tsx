import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Globe,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ConnectionPanel from "./components/ConnectionPanel";
import ServerList from "./components/ServerList";
import SettingsPanel from "./components/SettingsPanel";
import AccountPanel from "./components/AccountPanel";
import StatusBar from "./components/StatusBar";
import { useVPNStore } from "./stores/vpnStore";

type Tab = "connect" | "servers" | "settings" | "account";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("connect");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { status, isAuthenticated } = useVPNStore();

  // If not authenticated, show login
  // For now, we'll auto-authenticate for demo
  // TODO: Add proper login flow

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Custom Title Bar */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 72 : 240 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col bg-surface-900 border-r border-surface-800"
        >
          {/* Logo */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xl font-bold gradient-text"
                >
                  SACVPN
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <NavItem
              icon={Shield}
              label="Connect"
              active={activeTab === "connect"}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab("connect")}
              badge={status === "connected" ? "ON" : undefined}
              badgeColor={status === "connected" ? "green" : undefined}
            />
            <NavItem
              icon={Globe}
              label="Servers"
              active={activeTab === "servers"}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab("servers")}
            />
            <NavItem
              icon={Settings}
              label="Settings"
              active={activeTab === "settings"}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab("settings")}
            />
            <NavItem
              icon={User}
              label="Account"
              active={activeTab === "account"}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab("account")}
            />
          </nav>

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="m-3 p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-auto"
            >
              {activeTab === "connect" && <ConnectionPanel />}
              {activeTab === "servers" && (
                <ServerList onServerSelect={() => setActiveTab("connect")} />
              )}
              {activeTab === "settings" && <SettingsPanel />}
              {activeTab === "account" && <AccountPanel />}
            </motion.div>
          </AnimatePresence>

          {/* Status Bar */}
          <StatusBar />
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: "green" | "yellow" | "red";
}

function NavItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  badge,
  badgeColor,
}: NavItemProps) {
  const badgeColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        active
          ? "bg-brand-500/20 text-brand-400"
          : "text-surface-400 hover:bg-surface-800 hover:text-white"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-medium flex-1 text-left"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge && !collapsed && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full text-white font-semibold ${
            badgeColors[badgeColor || "green"]
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default App;
