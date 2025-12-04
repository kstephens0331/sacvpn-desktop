import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "../services/api";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface Subscription {
  planName: string;
  status: string;
  deviceLimit: number;
  devicesUsed: number;
  expiresAt: string | null;
  features: string[];
}

interface AuthState {
  // State
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  deviceId: string | null;
  hardwareId: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
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
      hardwareId: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Get hardware ID
          const hardwareId = await api.getHardwareId();
          set({ hardwareId });

          // Get device info
          const deviceInfo = {
            name: `${api.getDeviceType().toUpperCase()} Device`,
            type: api.getDeviceType(),
            os_version: api.getOSVersion(),
            client_version: api.getClientVersion(),
          };

          const response = await api.login(email, password, deviceInfo);

          if (response.success && response.user && response.subscription) {
            set({
              user: {
                id: response.user.id,
                email: response.user.email,
                fullName: response.user.full_name,
                avatarUrl: response.user.avatar_url,
              },
              subscription: {
                planName: response.subscription.plan_name,
                status: response.subscription.status,
                deviceLimit: response.subscription.device_limit,
                devicesUsed: response.subscription.devices_used,
                expiresAt: response.subscription.expires_at,
                features: response.subscription.features,
              },
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            set({
              isLoading: false,
              error: response.error || "Login failed",
            });
            return false;
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Login failed",
          });
          return false;
        }
      },

      logout: () => {
        api.clearTokens();
        set({
          user: null,
          subscription: null,
          error: null,
          deviceId: null,
        });
      },

      checkAuth: async () => {
        // Try to load existing tokens
        const hasTokens = api.loadTokens();
        if (!hasTokens) {
          return false;
        }

        // Verify tokens by fetching servers (requires auth)
        try {
          const response = await api.getServers();
          if (response.error?.includes("Invalid") || response.error?.includes("expired")) {
            api.clearTokens();
            set({ user: null, subscription: null });
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },

      setDeviceId: (id: string) => set({ deviceId: id }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "sacvpn-auth",
      partialize: (state) => ({
        deviceId: state.deviceId,
        hardwareId: state.hardwareId,
      }),
    }
  )
);
