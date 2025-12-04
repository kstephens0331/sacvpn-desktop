import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

export interface ConnectionStats {
  uploadSpeed: number; // bytes per second
  downloadSpeed: number; // bytes per second
  totalUploaded: number; // total bytes
  totalDownloaded: number; // total bytes
  connectedSince: number | null; // timestamp
}

interface VPNState {
  // Connection
  status: ConnectionStatus;
  currentServer: Server | null;
  connectionStats: ConnectionStats;

  // Servers
  servers: Server[];
  selectedServer: Server | null;
  favoriteServerIds: string[];

  // Settings
  autoConnect: boolean;
  killSwitch: boolean;
  splitTunneling: boolean;
  customDns: string;

  // User
  isAuthenticated: boolean;
  userEmail: string | null;
  subscriptionPlan: string | null;

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
  setAuth: (email: string, plan: string) => void;
  logout: () => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// Mock servers for development
const mockServers: Server[] = [
  {
    id: "us-east-1",
    name: "New York",
    country: "United States",
    countryCode: "US",
    city: "New York",
    ip: "198.51.100.1",
    load: 45,
    latency: 23,
    isFavorite: false,
    isRecommended: true,
  },
  {
    id: "us-west-1",
    name: "Los Angeles",
    country: "United States",
    countryCode: "US",
    city: "Los Angeles",
    ip: "198.51.100.2",
    load: 32,
    latency: 58,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "uk-london-1",
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    ip: "198.51.100.3",
    load: 67,
    latency: 89,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "de-frankfurt-1",
    name: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
    city: "Frankfurt",
    ip: "198.51.100.4",
    load: 28,
    latency: 112,
    isFavorite: false,
    isRecommended: true,
  },
  {
    id: "jp-tokyo-1",
    name: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    city: "Tokyo",
    ip: "198.51.100.5",
    load: 55,
    latency: 145,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "au-sydney-1",
    name: "Sydney",
    country: "Australia",
    countryCode: "AU",
    city: "Sydney",
    ip: "198.51.100.6",
    load: 41,
    latency: 198,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "ca-toronto-1",
    name: "Toronto",
    country: "Canada",
    countryCode: "CA",
    city: "Toronto",
    ip: "198.51.100.7",
    load: 38,
    latency: 35,
    isFavorite: false,
    isRecommended: true,
  },
  {
    id: "nl-amsterdam-1",
    name: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    city: "Amsterdam",
    ip: "198.51.100.8",
    load: 52,
    latency: 95,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "sg-singapore-1",
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    city: "Singapore",
    ip: "198.51.100.9",
    load: 61,
    latency: 172,
    isFavorite: false,
    isRecommended: false,
  },
  {
    id: "fr-paris-1",
    name: "Paris",
    country: "France",
    countryCode: "FR",
    city: "Paris",
    ip: "198.51.100.10",
    load: 44,
    latency: 102,
    isFavorite: false,
    isRecommended: false,
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
      servers: mockServers,
      selectedServer: mockServers[0],
      favoriteServerIds: [],
      autoConnect: false,
      killSwitch: true,
      splitTunneling: false,
      customDns: "",
      isAuthenticated: false,
      userEmail: null,
      subscriptionPlan: null,

      // Actions
      setStatus: (status) => set({ status }),
      setCurrentServer: (server) => set({ currentServer: server }),
      setSelectedServer: (server) => set({ selectedServer: server }),
      setServers: (servers) => set({ servers }),

      toggleFavorite: (serverId) =>
        set((state) => {
          const isFavorite = state.favoriteServerIds.includes(serverId);
          return {
            favoriteServerIds: isFavorite
              ? state.favoriteServerIds.filter((id) => id !== serverId)
              : [...state.favoriteServerIds, serverId],
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

      setAuth: (email, plan) =>
        set({
          isAuthenticated: true,
          userEmail: email,
          subscriptionPlan: plan,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          userEmail: null,
          subscriptionPlan: null,
        }),

      connect: async () => {
        const { selectedServer } = get();
        if (!selectedServer) return;

        set({ status: "connecting" });

        // TODO: Replace with actual Tauri command
        // await invoke('connect_vpn', { serverId: selectedServer.id });

        // Simulate connection delay
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

        // Start simulating stats
        const interval = setInterval(() => {
          const state = get();
          if (state.status !== "connected") {
            clearInterval(interval);
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
      },

      disconnect: async () => {
        set({ status: "disconnecting" });

        // TODO: Replace with actual Tauri command
        // await invoke('disconnect_vpn');

        await new Promise((resolve) => setTimeout(resolve, 500));

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
      },
    }),
    {
      name: "sacvpn-storage",
      partialize: (state) => ({
        favoriteServerIds: state.favoriteServerIds,
        autoConnect: state.autoConnect,
        killSwitch: state.killSwitch,
        splitTunneling: state.splitTunneling,
        customDns: state.customDns,
        selectedServer: state.selectedServer,
      }),
    }
  )
);
