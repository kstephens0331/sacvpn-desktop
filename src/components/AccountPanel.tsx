import { useState } from "react";
import {
  User,
  Crown,
  Calendar,
  ExternalLink,
  LogOut,
  Shield,
  Zap,
  Monitor,
  Gift,
  Copy,
  Check,
} from "lucide-react";
import { useVPNStore } from "../stores/vpnStore";

export default function AccountPanel() {
  const { isAuthenticated, userEmail, subscriptionPlan, logout, setAuth } =
    useVPNStore();
  const [copied, setCopied] = useState(false);

  // Demo login for testing
  const handleDemoLogin = () => {
    setAuth("demo@sacvpn.com", "Personal Pro");
  };

  // Demo data
  const referralCode = "SACVPN-DEMO";
  const referralLink = `https://sacvpn.com/ref/${referralCode}`;
  const devicesUsed = 3;
  const devicesLimit = 5;
  const subscriptionExpiry = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString();

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Sign in to SACVPN
            </h1>
            <p className="text-surface-400">
              Access your account and manage your subscription
            </p>
          </div>

          {/* Login Form */}
          <div className="glass-panel p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full h-12 px-4 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-12 px-4 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <button
                onClick={handleDemoLogin}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-500 to-accent-cyan text-white font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-surface-400 text-sm">
                Don't have an account?{" "}
                <a
                  href="https://sacvpn.com/pricing"
                  className="text-brand-400 hover:underline"
                >
                  Start free trial
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Account</h1>
        <p className="text-surface-400">Manage your SACVPN subscription</p>
      </div>

      {/* Profile Card */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{userEmail}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500 font-medium">
                  {subscriptionPlan}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-brand-400" />
            <span className="text-surface-400">Subscription</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">Active</div>
          <p className="text-surface-500 text-sm">
            Renews on {subscriptionExpiry}
          </p>
        </div>

        <div className="stats-card">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-5 h-5 text-accent-cyan" />
            <span className="text-surface-400">Devices</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {devicesUsed} / {devicesLimit}
          </div>
          <div className="w-full h-2 rounded-full bg-surface-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-cyan rounded-full"
              style={{ width: `${(devicesUsed / devicesLimit) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="glass-panel p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Plan Features</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Shield, text: "No-logs policy" },
            { icon: Zap, text: "WireGuard protocol" },
            { icon: Monitor, text: `${devicesLimit} simultaneous devices` },
            { icon: Shield, text: "Kill switch protection" },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-surface-300">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <feature.icon className="w-4 h-4 text-green-400" />
              </div>
              {feature.text}
            </div>
          ))}
        </div>
      </div>

      {/* Referral Program */}
      <div className="glass-panel p-6 mb-6 bg-gradient-to-r from-accent-pink/10 to-accent-purple/10 border-accent-pink/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-accent-pink/20">
            <Gift className="w-6 h-6 text-accent-pink" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Refer Friends, Earn Rewards
            </h3>
            <p className="text-surface-400 text-sm">
              Both you and your friend get 1 free month
            </p>
          </div>
        </div>

        <div className="bg-surface-900/50 rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-surface-400 mb-1">Your referral link</p>
            <p className="text-sm text-white font-mono truncate">
              {referralLink}
            </p>
          </div>
          <button
            onClick={copyReferralLink}
            className={`p-3 rounded-xl transition-all ${
              copied
                ? "bg-green-500/20 text-green-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-panel overflow-hidden">
        <QuickLink
          href="https://sacvpn.com/billing"
          icon={Crown}
          title="Manage Subscription"
          description="Upgrade, downgrade, or cancel your plan"
        />
        <QuickLink
          href="https://sacvpn.com/faq"
          icon={Shield}
          title="Help & Support"
          description="FAQs and contact support"
        />
        <QuickLink
          href="https://sacvpn.com/privacy"
          icon={Shield}
          title="Privacy Policy"
          description="Learn about our no-logs policy"
          isLast
        />
      </div>
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  isLast?: boolean;
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
  isLast,
}: QuickLinkProps) {
  const handleClick = () => {
    // Open in default browser
    window.open(href, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-4 p-4 hover:bg-surface-800/50 transition-colors text-left ${
        !isLast ? "border-b border-surface-800" : ""
      }`}
    >
      <div className="p-2 rounded-lg bg-surface-800">
        <Icon className="w-5 h-5 text-surface-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-surface-500 text-sm">{description}</p>
      </div>
      <ExternalLink className="w-5 h-5 text-surface-500" />
    </button>
  );
}
