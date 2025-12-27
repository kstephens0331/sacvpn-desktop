import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, getDeviceLimitForPlan } from "../lib/supabase";
import type { Profile, Subscription as DbSubscription } from "../lib/supabase";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: "personal" | "business";
}

export interface Subscription {
  id: string;
  planName: string;
  status: string;
  deviceLimit: number;
  devicesUsed: number;
  expiresAt: string | null;
  currentPeriodEnd: string | null;
}

interface AuthState {
  // State
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  deviceId: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  setDeviceId: (id: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      subscription: null,
      isLoading: false,
      error: null,
      deviceId: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Sign in with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            set({
              isLoading: false,
              error: authError.message,
            });
            return false;
          }

          if (!authData.user) {
            set({
              isLoading: false,
              error: "Login failed - no user returned",
            });
            return false;
          }

          // Fetch profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, full_name, avatar_url, account_type")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Profile fetch error:", profileError);
          }

          // Fetch subscription - get the most recent one for this user
          const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", authData.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subError) {
            console.error("Subscription fetch error:", subError);
          }

          // Count user's devices
          const { count: deviceCount } = await supabase
            .from("devices")
            .select("*", { count: "exact", head: true })
            .eq("user_id", authData.user.id)
            .eq("is_active", true);

          // Build user object
          const user: User = {
            id: authData.user.id,
            email: authData.user.email || email,
            fullName: (profile as Profile | null)?.full_name || null,
            avatarUrl: (profile as Profile | null)?.avatar_url || null,
            accountType: (profile as Profile | null)?.account_type || "personal",
          };

          // Build subscription object
          let subscriptionData: Subscription | null = null;
          if (subscription) {
            const dbSub = subscription as DbSubscription;
            subscriptionData = {
              id: dbSub.id,
              planName: formatPlanName(dbSub.plan),
              status: dbSub.status,
              deviceLimit: getDeviceLimitForPlan(dbSub.plan),
              devicesUsed: deviceCount || 0,
              expiresAt: dbSub.renews_at,
              currentPeriodEnd: dbSub.current_period_end,
            };
          }

          set({
            user,
            subscription: subscriptionData,
            isLoading: false,
            error: subscriptionData ? null : "No active subscription found",
          });

          return !!subscriptionData;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Login failed",
          });
          return false;
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          subscription: null,
          error: null,
          deviceId: null,
        });
      },

      checkAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            set({ user: null, subscription: null });
            return false;
          }

          // If we have a session but no user data, fetch it
          const { user } = get();
          if (!user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, email, full_name, avatar_url, account_type")
              .eq("id", session.user.id)
              .maybeSingle();

            // Fetch subscription - get the most recent one
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Count devices
            const { count: deviceCount } = await supabase
              .from("devices")
              .select("*", { count: "exact", head: true })
              .eq("user_id", session.user.id)
              .eq("is_active", true);

            if (profile) {
              const profileData = profile as Profile;
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email || "",
                  fullName: profileData.full_name,
                  avatarUrl: profileData.avatar_url,
                  accountType: profileData.account_type,
                },
              });
            }

            if (subscription) {
              const dbSub = subscription as DbSubscription;
              set({
                subscription: {
                  id: dbSub.id,
                  planName: formatPlanName(dbSub.plan),
                  status: dbSub.status,
                  deviceLimit: getDeviceLimitForPlan(dbSub.plan),
                  devicesUsed: deviceCount || 0,
                  expiresAt: dbSub.renews_at,
                  currentPeriodEnd: dbSub.current_period_end,
                },
              });
            }
          }

          return true;
        } catch {
          return false;
        }
      },

      refreshSubscription: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: deviceCount } = await supabase
            .from("devices")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_active", true);

          if (subscription) {
            const dbSub = subscription as DbSubscription;
            set({
              subscription: {
                id: dbSub.id,
                planName: formatPlanName(dbSub.plan),
                status: dbSub.status,
                deviceLimit: getDeviceLimitForPlan(dbSub.plan),
                devicesUsed: deviceCount || 0,
                expiresAt: dbSub.renews_at,
                currentPeriodEnd: dbSub.current_period_end,
              },
            });
          }
        } catch {
          // Silent fail on refresh
        }
      },

      setDeviceId: (id: string) => set({ deviceId: id }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "sacvpn-auth",
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        deviceId: state.deviceId,
      }),
    }
  )
);

// Helper to format plan names for display
function formatPlanName(plan: string): string {
  const planNames: Record<string, string> = {
    free: "Free Trial",
    trial: "Free Trial",
    personal: "Personal",
    gaming: "Gaming Pro",
    business10: "Business (10)",
    business50: "Business (50)",
    business100: "Business (100)",
    business500: "Enterprise (500)",
    business1k: "Enterprise (1K)",
    business2500: "Enterprise (2.5K)",
    business5k: "Enterprise (5K)",
    business10k: "Enterprise (10K)",
  };
  return planNames[plan] || plan;
}
