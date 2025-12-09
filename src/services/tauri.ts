/**
 * Tauri API services
 * Handles native platform integrations via Tauri plugins
 */

import { isTauri } from "./wireguard";

// Dynamic imports for Tauri APIs - only available when running in Tauri
let autostart: typeof import("@tauri-apps/plugin-autostart") | null = null;
let notification: typeof import("@tauri-apps/plugin-notification") | null = null;

// Initialize Tauri plugins
async function initPlugins() {
  if (!isTauri()) return;

  try {
    autostart = await import("@tauri-apps/plugin-autostart");
    notification = await import("@tauri-apps/plugin-notification");
  } catch (e) {
    console.warn("Failed to load Tauri plugins:", e);
  }
}

// Initialize on module load
initPlugins();

/**
 * Check if autostart is enabled
 */
export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri() || !autostart) {
    return false;
  }

  try {
    return await autostart.isEnabled();
  } catch (e) {
    console.error("Failed to check autostart status:", e);
    return false;
  }
}

/**
 * Enable autostart
 */
export async function enableAutostart(): Promise<boolean> {
  if (!isTauri() || !autostart) {
    console.warn("Autostart not available outside Tauri");
    return false;
  }

  try {
    await autostart.enable();
    return true;
  } catch (e) {
    console.error("Failed to enable autostart:", e);
    return false;
  }
}

/**
 * Disable autostart
 */
export async function disableAutostart(): Promise<boolean> {
  if (!isTauri() || !autostart) {
    return false;
  }

  try {
    await autostart.disable();
    return true;
  } catch (e) {
    console.error("Failed to disable autostart:", e);
    return false;
  }
}

/**
 * Toggle autostart
 */
export async function toggleAutostart(enable: boolean): Promise<boolean> {
  if (enable) {
    return await enableAutostart();
  } else {
    return await disableAutostart();
  }
}

/**
 * Send a notification
 */
export async function sendNotification(
  title: string,
  body: string
): Promise<void> {
  if (!isTauri() || !notification) {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }

  try {
    // Check permission first
    let permission = await notification.isPermissionGranted();

    if (!permission) {
      const result = await notification.requestPermission();
      permission = result === "granted";
    }

    if (permission) {
      await notification.sendNotification({
        title,
        body,
      });
    }
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}

/**
 * Send VPN connected notification
 */
export async function notifyConnected(serverName: string): Promise<void> {
  await sendNotification(
    "VPN Connected",
    `You are now connected to ${serverName}`
  );
}

/**
 * Send VPN disconnected notification
 */
export async function notifyDisconnected(): Promise<void> {
  await sendNotification(
    "VPN Disconnected",
    "Your VPN connection has been terminated"
  );
}

/**
 * Send VPN error notification
 */
export async function notifyError(error: string): Promise<void> {
  await sendNotification("VPN Connection Error", error);
}
