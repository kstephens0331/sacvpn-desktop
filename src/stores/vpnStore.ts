import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "../services/api";

export interface Server {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  city: string;
  ip: string;
  load: number;
  latency: number;
  isFavorite: boolean;
  isRecommended: boolean;
  isPremium: boolean;
  isGaming: boolean;
  isStreaming: boolean;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

export interface ConnectionStats {
  uploadSpeed: number;
  downloadSpeed: number;
  totalUploaded: number;
  totalDownloaded: number;
  connectedSince: number | null;
}

interface VPNState {
  // Connection
  status: ConnectionStatus;
  currentServer: Server | null;
  connectionStats: ConnectionStats;
  wgConfig: string | null;

  // Servers
  servers: Server[];
  selectedServer: Server | null;
  favoriteServerIds: string[];
  isLoadingServers: boolean;
  serversError: string | null;

  // Device
  deviceId: string | null;
  clientIp: string | null;

  // Settings
  autoConnect: boolean;
  killSwitch: boolean;
  splitTunneling: boolean;
  customDns: string;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setCurrentServer: (server: Server | null) => void;
  setSelectedServer: (server: Server | null) => void;
  setServers: (servers: Server[]) => void;
  toggleFavorite: (serverId: string) => void;
  updateConnectionStats: (stats: Partial<ConnectionStats>) => void;
  setAutoConnect: (value: boolean) => void;
  setKillSwitch: (value: boolean) => void;
  setSplitTunneling: (value: boolean) => void;
  setCustomDns: (value: string) => void;

  // API Actions
  fetchServers: () => Promise<void>;
  registerDevice: (serverId?: string) => Promise<string | null>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchServer: (newServerId: string) => Promise<void>;
}

// Country code mapping
const countryCodeMap: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Japan: "JP",
  Australia: "AU",
  Canada: "CA",
  Netherlands: "NL",
  Singapore: "SG",
  Sweden: "SE",
  Switzerland: "CH",
  Brazil: "BR",
  India: "IN",
  "South Korea": "KR",
};

// Convert API server to local format
function convertServer(apiServer: api.Server, favoriteIds: string[]): Server {
  return {
    id: apiServer.id,
    name: apiServer.name,
    country: apiServer.country,
    countryCode: countryCodeMap[apiServer.country] || "XX",
    city: apiServer.city,
    ip: "",
    load: apiServer.load,
    latency: apiServer.latency || 0,
    isFavorite: favoriteIds.includes(apiServer.id),
    isRecommended: apiServer.load < 50,
    isPremium: apiServer.is_premium,
    isGaming: apiServer.is_gaming_optimized,
    isStreaming: apiServer.is_streaming_optimized,
  };
}

// Mock servers for offline/development
const mockServers: Server[] = [
  {
    id: "us-east-1",
    name: "Virginia",
    country: "United States",
    countryCode: "US",
    city: "Virginia",
    ip: "",
    load: 45,
    latency: 23,
    isFavorite: false,
    isRecommended: true,
    isPremium: false,
    isGaming: false,
    isStreaming: false,
  },
  {
    id: "us-central-1",
    name: "Dallas",
    country: "United States",
    countryCode: "US",
    city: "Dallas",
    ip: "",
    load: 32,
    latency: 35,
    isFavorite: false,
    isRecommended: true,
    isPremium: false,
    isGaming: true,
    isStreaming: false,
  },
];

export const useVPNStore = create<VPNState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: "disconnected",
      currentServer: null,
      connectionStats: {
        uploadSpeed: 0,
        downloadSpeed: 0,
        totalUploaded: 0,
        totalDownloaded: 0,
        connectedSince: null,
      },
      wgConfig: null,
      servers: mockServers,
      selectedServer: mockServers[0],
      favoriteServerIds: [],
      isLoadingServers: false,
      serversError: null,
      deviceId: null,
      clientIp: null,
      autoConnect: false,
      killSwitch: true,
      splitTunneling: false,
      customDns: "",

      // Basic Actions
      setStatus: (status) => set({ status }),
      setCurrentServer: (server) => set({ currentServer: server }),
      setSelectedServer: (server) => set({ selectedServer: server }),
      setServers: (servers) => set({ servers }),

      toggleFavorite: (serverId) =>
        set((state) => {
          const isFavorite = state.favoriteServerIds.includes(serverId);
          const newFavorites = isFavorite
            ? state.favoriteServerIds.filter((id) => id !== serverId)
            : [...state.favoriteServerIds, serverId];

          return {
            favoriteServerIds: newFavorites,
            servers: state.servers.map((s) =>
              s.id === serverId ? { ...s, isFavorite: !isFavorite } : s
            ),
          };
        }),

      updateConnectionStats: (stats) =>
        set((state) => ({
          connectionStats: { ...state.connectionStats, ...stats },
        })),

      setAutoConnect: (value) => set({ autoConnect: value }),
      setKillSwitch: (value) => set({ killSwitch: value }),
      setSplitTunneling: (value) => set({ splitTunneling: value }),
      setCustomDns: (value) => set({ customDns: value }),

      // API Actions
      fetchServers: async () => {
        set({ isLoadingServers: true, serversError: null });

        try {
          const response = await api.getServers();

          if (response.error) {
            // Fall back to mock servers if API fails
            set({
              serversError: response.error,
              isLoadingServers: false,
              servers: mockServers,
            });
            return;
          }

          const { favoriteServerIds } = get();
          const servers = response.servers.map((s) =>
            convertServer(s, favoriteServerIds)
          );

          // Use fetched servers if available, otherwise keep mocks
          if (servers.length > 0) {
            set({
              servers,
              isLoadingServers: false,
              selectedServer: get().selectedServer || servers[0],
            });
          } else {
            set({ isLoadingServers: false });
          }
        } catch (error) {
          set({
            serversError:
              error instanceof Error ? error.message : "Failed to fetch servers",
            isLoadingServers: false,
          });
        }
      },

      registerDevice: async (serverId?: string) => {
        try {
          const hardwareId = await api.getHardwareId();
          const deviceType = api.getDeviceType();
          const deviceName = `SACVPN ${deviceType.toUpperCase()}`;

          const response = await api.registerDevice(
            deviceName,
            deviceType,
            hardwareId,
            serverId
          );

          if (response.success && response.device_id && response.config) {
            set({
              deviceId: response.device_id,
              wgConfig: response.config,
            });
            return response.config;
          }

          return null;
        } catch (error) {
          console.error("Device registration failed:", error);
          return null;
        }
      },

      connect: async () => {
        const { selectedServer, deviceId } = get();
        if (!selectedServer) return;

        set({ status: "connecting" });

        try {
          let config = get().wgConfig;

          // If no config or different server, get new config
          if (!config || !deviceId) {
            config = await get().registerDevice(selectedServer.id);

            if (!config) {
              // Still allow demo mode without API
              console.log("Running in demo mode - no API connection");
            }
          }

          // TODO: Replace with actual Tauri command to apply WireGuard config
          // await invoke('connect_vpn', { config });

          // Simulate connection
          await new Promise((resolve) => setTimeout(resolve, 2000));

          set({
            status: "connected",
            currentServer: selectedServer,
            connectionStats: {
              uploadSpeed: 0,
              downloadSpeed: 0,
              totalUploaded: 0,
              totalDownloaded: 0,
              connectedSince: Date.now(),
            },
          });

          // Start telemetry reporting
          const { deviceId: devId } = get();
          if (devId) {
            api.reportTelemetry({
              device_id: devId,
              is_connected: true,
              client_version: api.getClientVersion(),
              os_version: api.getOSVersion(),
            });
          }

          // Simulate stats (replace with real WireGuard stats via Tauri)
          const statsInterval = setInterval(() => {
            const state = get();
            if (state.status !== "connected") {
              clearInterval(statsInterval);
              return;
            }
            set((s) => ({
              connectionStats: {
                ...s.connectionStats,
                uploadSpeed: Math.random() * 500000 + 100000,
                downloadSpeed: Math.random() * 2000000 + 500000,
                totalUploaded:
                  s.connectionStats.totalUploaded + Math.random() * 50000,
                totalDownloaded:
                  s.connectionStats.totalDownloaded + Math.random() * 200000,
              },
            }));
          }, 1000);
        } catch (error) {
          console.error("Connection failed:", error);
          set({ status: "disconnected" });
        }
      },

      disconnect: async () => {
        set({ status: "disconnecting" });

        try {
          // TODO: Replace with actual Tauri command
          // await invoke('disconnect_vpn');

          await new Promise((resolve) => setTimeout(resolve, 500));

          // Report disconnect telemetry
          const { deviceId, connectionStats } = get();
          if (deviceId && connectionStats.connectedSince) {
            const duration = Math.floor(
              (Date.now() - connectionStats.connectedSince) / 1000
            );
            api.reportTelemetry({
              device_id: deviceId,
              is_connected: false,
              bytes_sent: connectionStats.totalUploaded,
              bytes_received: connectionStats.totalDownloaded,
              connection_duration: duration,
              disconnect_reason: "user_initiated",
            });
          }

          set({
            status: "disconnected",
            currentServer: null,
            connectionStats: {
              uploadSpeed: 0,
              downloadSpeed: 0,
              totalUploaded: 0,
              totalDownloaded: 0,
              connectedSince: null,
            },
          });
        } catch (error) {
          console.error("Disconnect failed:", error);
          set({ status: "disconnected" });
        }
      },

      switchServer: async (newServerId: string) => {
        const { deviceId, status } = get();
        const wasConnected = status === "connected";

        if (wasConnected) {
          set({ status: "disconnecting" });
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        set({ status: "connecting" });

        try {
          if (deviceId) {
            const response = await api.switchServer(deviceId, newServerId);

            if (response.success && response.config) {
              set({ wgConfig: response.config });

              const newServer = get().servers.find((s) => s.id === newServerId);
              if (newServer) {
                set({ selectedServer: newServer });
              }

              // TODO: Apply new config via Tauri
              // await invoke('connect_vpn', { config: response.config });

              if (wasConnected) {
                await new Promise((resolve) => setTimeout(resolve, 1500));

                set({
                  status: "connected",
                  currentServer: newServer || null,
                  connectionStats: {
                    uploadSpeed: 0,
                    downloadSpeed: 0,
                    totalUploaded: 0,
                    totalDownloaded: 0,
                    connectedSince: Date.now(),
                  },
                });
              } else {
                set({ status: "disconnected" });
              }
            } else {
              throw new Error(response.error || "Server switch failed");
            }
          } else {
            // No device registered, just update selection
            const newServer = get().servers.find((s) => s.id === newServerId);
            set({
              selectedServer: newServer || null,
              status: wasConnected ? "connected" : "disconnected",
            });
          }
        } catch (error) {
          console.error("Server switch failed:", error);
          set({ status: wasConnected ? "connected" : "disconnected" });
        }
      },
    }),
    {
      name: "sacvpn-vpn-storage",
      partialize: (state) => ({
        favoriteServerIds: state.favoriteServerIds,
        autoConnect: state.autoConnect,
        killSwitch: state.killSwitch,
        splitTunneling: state.splitTunneling,
        customDns: state.customDns,
        selectedServer: state.selectedServer,
        deviceId: state.deviceId,
      }),
    }
  )
);
