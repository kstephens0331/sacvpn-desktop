import { useState, useEffect } from "react";
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
import ConnectionPanel from "./components/ConnectionPanel";
import ServerList from "./components/ServerList";
import SettingsPanel from "./components/SettingsPanel";
import AccountPanel from "./components/AccountPanel";
import StatusBar from "./components/StatusBar";
import UpdateNotification from "./components/UpdateNotification";
import { useVPNStore } from "./stores/vpnStore";
import { useAuthStore } from "./stores/authStore";

type Tab = "connect" | "servers" | "settings" | "account";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("connect");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { status } = useVPNStore();
  const { checkAuth, user } = useAuthStore();

  // Check auth on startup
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to account tab if not authenticated
  useEffect(() => {
    if (!user && activeTab !== "account") {
      setActiveTab("account");
    }
  }, [user, activeTab]);

  return (
    <div className="h-screen flex flex-col bg-dark-900 overflow-hidden relative">
      {/* Animated background gradient orbs - like website hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Custom Title Bar */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar Navigation */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 72 : 240 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col bg-dark-800/80 backdrop-blur-xl border-r border-white/10"
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
              badgeColor={status === "connected" ? "lime" : undefined}
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
            className="m-3 p-2 rounded-lg hover:bg-white/10 text-surface-400 hover:text-white transition-colors"
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

      {/* Update Notification (appears when update is available) */}
      <UpdateNotification />
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
  badgeColor?: "lime" | "yellow" | "red";
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
    lime: "bg-accent-lime",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        active
          ? "bg-brand-500/20 text-brand-400"
          : "text-surface-400 hover:bg-white/10 hover:text-white"
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
            badgeColors[badgeColor || "lime"]
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default App;
