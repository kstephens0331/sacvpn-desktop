/**
 * SACVPN API Service
 * Handles all communication with the Supabase Edge Functions
 */

const API_BASE_URL = "https://ltwuqjmncldopkutiyak.supabase.co/functions/v1";

// Store auth tokens
let accessToken: string | null = null;
let refreshToken: string | null = null;

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
  };
  subscription?: {
    plan_name: string;
    status: string;
    device_limit: number;
    devices_used: number;
    expires_at: string | null;
    features: string[];
  };
  error?: string;
  needs_subscription?: boolean;
  subscribe_url?: string;
}

export interface Server {
  id: string;
  name: string;
  region: string;
  country: string;
  city: string;
  load: number;
  latency: number | null;
  is_premium: boolean;
  is_gaming_optimized: boolean;
  is_streaming_optimized: boolean;
}

export interface ServersResponse {
  servers: Server[];
  grouped: Record<string, Server[]>;
  has_premium: boolean;
  total_count: number;
  error?: string;
}

export interface DeviceRegistrationResponse {
  success: boolean;
  message: string;
  device_id?: string;
  server?: {
    id: string;
    name: string;
    region: string;
    city: string;
  };
  config?: string; // WireGuard config file content
  error?: string;
  device_count?: number;
  device_limit?: number;
}

export interface ConfigResponse {
  success: boolean;
  device?: {
    id: string;
    name: string;
    type: string;
  };
  server?: {
    id: string;
    name: string;
    region: string;
    country: string;
    city: string;
    endpoint: string;
  };
  config?: string;
  client_ip?: string;
  created_at?: string;
  error?: string;
  needs_registration?: boolean;
}

// Helper to get headers with auth
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
}

// Save tokens to secure storage
export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;

  // In production, use Tauri's secure storage
  try {
    localStorage.setItem("sacvpn_access_token", access);
    localStorage.setItem("sacvpn_refresh_token", refresh);
  } catch {
    // Silent fail for SSR or restricted environments
  }
}

// Load tokens from storage
export function loadTokens(): boolean {
  try {
    accessToken = localStorage.getItem("sacvpn_access_token");
    refreshToken = localStorage.getItem("sacvpn_refresh_token");
    return !!accessToken;
  } catch {
    return false;
  }
}

// Clear tokens
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem("sacvpn_access_token");
    localStorage.removeItem("sacvpn_refresh_token");
  } catch {
    // Silent fail
  }
}

// Check if authenticated
export function isAuthenticated(): boolean {
  return !!accessToken;
}

/**
 * Authenticate user
 */
export async function login(
  email: string,
  password: string,
  deviceInfo?: {
    name: string;
    type: string;
    os_version: string;
    client_version: string;
  }
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, device_info: deviceInfo }),
    });

    const data: AuthResponse = await response.json();

    if (data.success && data.session) {
      setTokens(data.session.access_token, data.session.refresh_token);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get list of available VPN servers
 */
export async function getServers(): Promise<ServersResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-servers`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });

    return await response.json();
  } catch (error) {
    return {
      servers: [],
      grouped: {},
      has_premium: false,
      total_count: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Register a new device and get VPN configuration
 */
export async function registerDevice(
  deviceName: string,
  deviceType: "windows" | "macos" | "linux" | "ios" | "android",
  hardwareId?: string,
  preferredServerId?: string
): Promise<DeviceRegistrationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-register-device`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        device_name: deviceName,
        device_type: deviceType,
        hardware_id: hardwareId,
        preferred_server_id: preferredServerId,
      }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: "Failed to register device",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get configuration for an existing device
 */
export async function getConfig(
  deviceId?: string,
  hardwareId?: string,
  serverId?: string
): Promise<ConfigResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-get-config`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        device_id: deviceId,
        hardware_id: hardwareId,
        server_id: serverId,
      }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Switch to a different VPN server
 */
export async function switchServer(
  deviceId: string,
  newServerId: string
): Promise<ConfigResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-switch-server`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        device_id: deviceId,
        new_server_id: newServerId,
      }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Report telemetry data
 */
export async function reportTelemetry(data: {
  device_id: string;
  is_connected: boolean;
  bytes_sent?: number;
  bytes_received?: number;
  last_handshake?: string;
  client_version?: string;
  os_version?: string;
  connection_duration?: number;
  disconnect_reason?: string;
}): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/vpn-telemetry`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch {
    // Telemetry failures should be silent
    return { success: false };
  }
}

/**
 * Get hardware ID for this device
 * Uses Tauri API in production, generates a UUID in dev
 */
export async function getHardwareId(): Promise<string> {
  // Check if we already have one stored
  try {
    const stored = localStorage.getItem("sacvpn_hardware_id");
    if (stored) return stored;
  } catch {
    // Silent fail
  }

  // In Tauri, we'd use the system info
  // For now, generate a persistent UUID
  const id = crypto.randomUUID();

  try {
    localStorage.setItem("sacvpn_hardware_id", id);
  } catch {
    // Silent fail
  }

  return id;
}

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
  return "1.0.0"; // Update with actual version from package.json
}
