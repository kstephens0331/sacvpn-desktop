import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "../services/api";
import * as wireguard from "../services/wireguard";
import * as tauriService from "../services/tauri";

export interface Server {
  id: string;
  name: string;
  region: string;
  ip: string;
  load: number;
  isFavorite: boolean;
  isRecommended: boolean;
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
  connectionError: string | null;

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
  showNotifications: boolean;

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
  setShowNotifications: (value: boolean) => void;
  clearConnectionError: () => void;

  // API Actions
  fetchServers: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchServer: (newServerId: string) => Promise<void>;
  startStatsPolling: () => void;
  stopStatsPolling: () => void;
}

// Stats polling interval ID
let statsIntervalId: ReturnType<typeof setInterval> | null = null;

// Convert API server to local format
function convertServer(apiServer: api.VpnServer, favoriteIds: string[]): Server {
  return {
    id: apiServer.id,
    name: apiServer.name,
    region: apiServer.region,
    ip: apiServer.ip,
    load: apiServer.load,
    isFavorite: favoriteIds.includes(apiServer.id),
    isRecommended: apiServer.load < 50,
  };
}

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
      connectionError: null,
      servers: [],
      selectedServer: null,
      favoriteServerIds: [],
      isLoadingServers: false,
      serversError: null,
      deviceId: null,
      clientIp: null,
      autoConnect: false,
      killSwitch: true,
      splitTunneling: false,
      customDns: "",
      showNotifications: true,

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
      setShowNotifications: (value) => set({ showNotifications: value }),
      clearConnectionError: () => set({ connectionError: null }),

      // API Actions
      fetchServers: async () => {
        set({ isLoadingServers: true, serversError: null });

        try {
          const response = await api.getServers();

          if (!response.success || !response.servers) {
            set({
              serversError: response.error || "Failed to fetch servers",
              isLoadingServers: false,
            });
            return;
          }

          const { favoriteServerIds } = get();
          const servers = response.servers.map((s) =>
            convertServer(s, favoriteServerIds)
          );

          set({
            servers,
            isLoadingServers: false,
            selectedServer: get().selectedServer || servers[0] || null,
          });
        } catch (error) {
          set({
            serversError:
              error instanceof Error ? error.message : "Failed to fetch servers",
            isLoadingServers: false,
          });
        }
      },

      connect: async () => {
        const { selectedServer } = get();
        if (!selectedServer) {
          set({ connectionError: "No server selected" });
          return;
        }

        set({ status: "connecting", connectionError: null });

        try {
          const deviceName = api.generateDeviceName();
          const platform = api.getDeviceType();

          // Get hardware fingerprint for device identification
          const hardwareId = await api.getDeviceFingerprint();
          if (!hardwareId) {
            set({
              status: "disconnected",
              connectionError: "Failed to get device fingerprint",
            });
            return;
          }

          // Call Edge Function to register device and generate keys
          // The Edge Function handles everything: device registration, key generation, config creation
          let configResult = await api.generateWireGuardKey(hardwareId, deviceName, platform);

          // If device already registered, get existing config instead
          if (!configResult.success) {
            console.log("Device might already be registered, fetching existing config...");
            configResult = await api.getWireGuardConfig(hardwareId);
          }

          if (!configResult.success || !configResult.config) {
            set({
              status: "disconnected",
              connectionError: configResult.error || "Failed to get VPN configuration. Please try again.",
            });
            return;
          }

          const configText = configResult.config.configText;
          set({
            wgConfig: configText,
            clientIp: configResult.config.clientIp,
            deviceId: hardwareId,
          });

          // Parse config and connect via Tauri backend
          const vpnConfig = wireguard.parseWireGuardConfig(configText);
          await wireguard.connectVpn(selectedServer.id, vpnConfig);

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

          // Start polling for stats
          get().startStatsPolling();

          // Send notification
          if (get().showNotifications) {
            tauriService.notifyConnected(selectedServer.name);
          }

          // Report telemetry
          api.reportTelemetry({
            device_id: hardwareId,
            is_connected: true,
            client_version: api.getClientVersion(),
            os_version: api.getOSVersion(),
          });
        } catch (error) {
          set({
            status: "disconnected",
            connectionError: error instanceof Error ? error.message : "Connection failed",
          });
        }
      },

      disconnect: async () => {
        set({ status: "disconnecting" });

        // Stop stats polling
        get().stopStatsPolling();

        try {
          // Disconnect via Tauri backend
          await wireguard.disconnectVpn();

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

          // Send notification
          if (get().showNotifications) {
            tauriService.notifyDisconnected();
          }
        } catch (error) {
          set({
            status: "disconnected",
            connectionError: error instanceof Error ? error.message : "Disconnect failed",
          });
        }
      },

      switchServer: async (newServerId: string) => {
        const { status } = get();
        const wasConnected = status === "connected";

        // Find the new server
        const newServer = get().servers.find((s) => s.id === newServerId);
        if (!newServer) {
          set({ connectionError: "Server not found" });
          return;
        }

        // Update selection
        set({ selectedServer: newServer });

        // If connected, reconnect to new server
        if (wasConnected) {
          await get().disconnect();
          await get().connect();
        }
      },

      startStatsPolling: () => {
        // Stop existing polling if any
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
        }

        // Poll stats every second when connected
        statsIntervalId = setInterval(async () => {
          const { status } = get();
          if (status !== "connected") {
            return;
          }

          try {
            const stats = await wireguard.getConnectionStats();
            set({
              connectionStats: {
                uploadSpeed: stats.upload_speed,
                downloadSpeed: stats.download_speed,
                totalUploaded: stats.total_uploaded,
                totalDownloaded: stats.total_downloaded,
                connectedSince: stats.connected_since
                  ? stats.connected_since * 1000
                  : get().connectionStats.connectedSince,
              },
            });
          } catch (error) {
            console.error("Failed to get connection stats:", error);
          }
        }, 1000);
      },

      stopStatsPolling: () => {
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
          statsIntervalId = null;
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
        showNotifications: state.showNotifications,
        selectedServer: state.selectedServer,
        deviceId: state.deviceId,
      }),
    }
  )
);
