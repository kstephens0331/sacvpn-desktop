/**
 * SACVPN API Service
 * Handles communication with the Railway backend for VPN operations
 */

import { supabase } from "../lib/supabase";

// Environment configuration
export const API_URL = import.meta.env.VITE_API_URL || "https://scvpn-production.up.railway.app";

// =============================================================================
// WireGuard Configuration
// =============================================================================

export interface WireGuardConfigResponse {
  configText: string;
  qrCode?: string;
  deviceName: string;
  nodeName: string;
  nodeRegion: string;
  clientIp: string;
  platform: string;
}

/**
 * Generate WireGuard keys for a device
 */
export async function generateWireGuardKey(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${API_URL}/api/wireguard/generate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || "Failed to generate key" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get WireGuard configuration for a device
 */
export async function getWireGuardConfig(deviceId: string): Promise<{
  success: boolean;
  config?: WireGuardConfigResponse;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/device/${deviceId}/config-data`);

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || "Failed to get config" };
    }

    const data = await response.json();
    return { success: true, config: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Download raw WireGuard config file content
 */
export async function downloadWireGuardConfig(deviceId: string): Promise<{
  success: boolean;
  configText?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/device/${deviceId}/config`);

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || "Failed to download config" };
    }

    const configText = await response.text();
    return { success: true, configText };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// =============================================================================
// Device Management
// =============================================================================

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
  hasConfig: boolean;
}

/**
 * Register a new device in Supabase
 */
export async function registerDevice(
  name: string,
  platform: "windows" | "macos" | "linux"
): Promise<{
  success: boolean;
  deviceId?: string;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Check if device already exists for this user/platform
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", platform)
      .eq("is_active", true)
      .maybeSingle();

    if (existingDevice) {
      return { success: true, deviceId: existingDevice.id };
    }

    // Create new device
    const { data: newDevice, error } = await supabase
      .from("devices")
      .insert({
        user_id: session.user.id,
        name,
        platform,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, deviceId: newDevice.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register device",
    };
  }
}

/**
 * Get user's devices
 */
export async function getUserDevices(): Promise<{
  success: boolean;
  devices?: DeviceInfo[];
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { data: devices, error } = await supabase
      .from("devices")
      .select(`
        id,
        name,
        platform,
        is_active,
        created_at,
        device_configs (id)
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const deviceList: DeviceInfo[] = (devices || []).map((d: {
      id: string;
      name: string;
      platform: string;
      is_active: boolean;
      created_at: string;
      device_configs: { id: string }[] | null;
    }) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      isActive: d.is_active,
      createdAt: d.created_at,
      hasConfig: Array.isArray(d.device_configs) && d.device_configs.length > 0,
    }));

    return { success: true, devices: deviceList };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get devices",
    };
  }
}

/**
 * Deactivate a device
 */
export async function deactivateDevice(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("devices")
      .update({ is_active: false })
      .eq("id", deviceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deactivate device",
    };
  }
}

// =============================================================================
// Server List
// =============================================================================

export interface VpnServer {
  id: string;
  name: string;
  ip: string;
  load: number;
  region: string;
}

/**
 * Get available VPN servers from vps_hosts table
 */
export async function getServers(): Promise<{
  success: boolean;
  servers?: VpnServer[];
  error?: string;
}> {
  try {
    // Get server list
    const { data: hosts, error: hostsError } = await supabase
      .from("vps_hosts")
      .select("id, name, ip");

    if (hostsError) {
      return { success: false, error: hostsError.message };
    }

    // Get latest metrics for load info
    const { data: metrics } = await supabase
      .from("vps_metrics")
      .select("host_id, cpu, load1")
      .order("ts", { ascending: false });

    // Build metrics map (latest per host)
    const metricsMap = new Map<string, { cpu: number; load1: number }>();
    if (metrics) {
      for (const m of metrics) {
        if (!metricsMap.has(m.host_id)) {
          metricsMap.set(m.host_id, { cpu: m.cpu, load1: m.load1 });
        }
      }
    }

    // Combine hosts with metrics
    const servers: VpnServer[] = (hosts || []).map((h: { id: string; name: string; ip: string }) => {
      const hostMetrics = metricsMap.get(h.id);
      return {
        id: h.id,
        name: h.name,
        ip: h.ip,
        load: hostMetrics?.cpu || 0,
        region: extractRegion(h.name),
      };
    });

    return { success: true, servers };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get servers",
    };
  }
}

// Helper to extract region from server name
function extractRegion(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("virginia") || lower.includes("va")) return "US East";
  if (lower.includes("dallas") || lower.includes("tx")) return "US Central";
  if (lower.includes("los angeles") || lower.includes("la") || lower.includes("california")) return "US West";
  if (lower.includes("london") || lower.includes("uk")) return "Europe";
  if (lower.includes("frankfurt") || lower.includes("germany")) return "Europe";
  if (lower.includes("tokyo") || lower.includes("japan")) return "Asia";
  if (lower.includes("singapore")) return "Asia";
  return "Unknown";
}

// =============================================================================
// Telemetry
// =============================================================================

export interface TelemetryData {
  device_id: string;
  is_connected: boolean;
  bytes_sent?: number;
  bytes_received?: number;
  client_version?: string;
  os_version?: string;
  connection_duration?: number;
  disconnect_reason?: string;
}

/**
 * Report telemetry data
 */
export async function reportTelemetry(data: TelemetryData): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return;

  try {
    await supabase.from("device_latest_telemetry").upsert({
      device_id: data.device_id,
      is_connected: data.is_connected,
      last_seen: new Date().toISOString(),
    });
  } catch {
    // Telemetry failures are silent
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get device type based on platform
 */
export function getDeviceType(): "windows" | "macos" | "linux" {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac")) return "macos";
  return "linux";
}

/**
 * Get OS version
 */
export function getOSVersion(): string {
  return navigator.userAgent;
}

/**
 * Get client version
 */
export function getClientVersion(): string {
  return "1.0.0";
}

/**
 * Generate device name
 */
export function generateDeviceName(): string {
  const type = getDeviceType();
  const typeNames = {
    windows: "Windows PC",
    macos: "Mac",
    linux: "Linux PC",
  };
  return `SACVPN ${typeNames[type]}`;
}
