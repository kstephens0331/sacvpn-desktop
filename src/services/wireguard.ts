/**
 * WireGuard configuration parser and Tauri bridge
 * Converts raw WireGuard config text to structured format for Tauri backend
 */

import { invoke } from "@tauri-apps/api/core";

// Matches the Rust VpnConfig struct
export interface VpnConfig {
  interface: InterfaceConfig;
  peer: PeerConfig;
}

export interface InterfaceConfig {
  private_key: string;
  address: string;
  dns: string[];
  mtu: number | null;
}

export interface PeerConfig {
  public_key: string;
  endpoint: string;
  allowed_ips: string[];
  persistent_keepalive: number | null;
}

export interface ConnectionStats {
  upload_speed: number;
  download_speed: number;
  total_uploaded: number;
  total_downloaded: number;
  connected_since: number | null;
}

export type VpnStatus = "disconnected" | "connecting" | "connected" | "disconnecting" | { error: string };

/**
 * Parse raw WireGuard config text into structured VpnConfig
 */
export function parseWireGuardConfig(configText: string): VpnConfig {
  const lines = configText.split("\n");

  const config: VpnConfig = {
    interface: {
      private_key: "",
      address: "",
      dns: [],
      mtu: null,
    },
    peer: {
      public_key: "",
      endpoint: "",
      allowed_ips: [],
      persistent_keepalive: null,
    },
  };

  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section headers
    if (trimmed.toLowerCase() === "[interface]") {
      currentSection = "interface";
      continue;
    }
    if (trimmed.toLowerCase() === "[peer]") {
      currentSection = "peer";
      continue;
    }

    // Parse key-value pairs
    const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    const keyLower = key.toLowerCase();

    if (currentSection === "interface") {
      switch (keyLower) {
        case "privatekey":
          config.interface.private_key = value.trim();
          break;
        case "address":
          config.interface.address = value.trim();
          break;
        case "dns":
          config.interface.dns = value.split(",").map((s) => s.trim());
          break;
        case "mtu":
          config.interface.mtu = parseInt(value.trim(), 10);
          break;
      }
    } else if (currentSection === "peer") {
      switch (keyLower) {
        case "publickey":
          config.peer.public_key = value.trim();
          break;
        case "endpoint":
          config.peer.endpoint = value.trim();
          break;
        case "allowedips":
          config.peer.allowed_ips = value.split(",").map((s) => s.trim());
          break;
        case "persistentkeepalive":
          config.peer.persistent_keepalive = parseInt(value.trim(), 10);
          break;
      }
    }
  }

  return config;
}

/**
 * Check if running in Tauri environment
 * In Tauri 2.0, check for __TAURI_INTERNALS__ or window.__TAURI__
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;

  // Tauri 2.0 uses __TAURI_INTERNALS__
  if ("__TAURI_INTERNALS__" in window) return true;

  // Fallback for Tauri 1.x
  if ("__TAURI__" in window) return true;

  return false;
}

/**
 * Connect to VPN via Tauri backend
 */
export async function connectVpn(serverId: string, config: VpnConfig): Promise<void> {
  if (!isTauri()) {
    console.warn("Not running in Tauri - simulating connection");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return;
  }

  await invoke("connect_vpn", { serverId, config });
}

/**
 * Disconnect from VPN via Tauri backend
 */
export async function disconnectVpn(): Promise<void> {
  if (!isTauri()) {
    console.warn("Not running in Tauri - simulating disconnection");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return;
  }

  await invoke("disconnect_vpn");
}

/**
 * Get current VPN status from Tauri backend
 */
export async function getVpnStatus(): Promise<VpnStatus> {
  if (!isTauri()) {
    return "disconnected";
  }

  return await invoke("get_vpn_status");
}

/**
 * Get connection statistics from Tauri backend
 */
export async function getConnectionStats(): Promise<ConnectionStats> {
  if (!isTauri()) {
    return {
      upload_speed: 0,
      download_speed: 0,
      total_uploaded: 0,
      total_downloaded: 0,
      connected_since: null,
    };
  }

  return await invoke("get_connection_stats");
}
