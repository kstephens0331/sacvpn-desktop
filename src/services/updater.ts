import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import packageJson from "../../package.json";

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  body?: string;
}

const CURRENT_VERSION = packageJson.version;
const UPDATE_URL = "https://github.com/kstephens0331/sacvpn-desktop/releases/latest/download/latest.json";

/**
 * Check for available updates from GitHub Releases
 * Uses direct HTTP fetch as fallback if Tauri updater fails
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  console.log("Checking for updates, current version:", CURRENT_VERSION);

  // Try Tauri updater first
  try {
    console.log("Trying Tauri updater...");
    const update = await check();
    console.log("Tauri updater result:", update);

    if (update) {
      return {
        available: true,
        currentVersion: update.currentVersion,
        latestVersion: update.version,
        body: update.body,
      };
    }

    return {
      available: false,
      currentVersion: CURRENT_VERSION,
    };
  } catch (tauriError) {
    console.warn("Tauri updater failed, trying direct fetch:", tauriError);
  }

  // Fallback: Direct HTTP fetch
  try {
    console.log("Fetching from:", UPDATE_URL);
    const response = await window.fetch(UPDATE_URL, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { version: string; notes?: string };
    console.log("Fetched update info:", data);

    const latestVersion = data.version;
    const isNewer = compareVersions(latestVersion, CURRENT_VERSION) > 0;

    return {
      available: isNewer,
      currentVersion: CURRENT_VERSION,
      latestVersion: latestVersion,
      body: data.notes,
    };
  } catch (fetchError) {
    console.error("Direct fetch also failed:", fetchError);
    throw new Error(`Update check failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
  }
}

/**
 * Compare two semver versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Download and install available update
 * Returns true if update was installed successfully
 */
export async function downloadAndInstall(): Promise<boolean> {
  try {
    const update = await check();

    if (!update) {
      return false;
    }

    console.log(`Installing update ${update.version}...`);

    // Download and install the update
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log(`Started downloading update`);
          break;
        case "Progress":
          console.log(`Downloaded ${event.data.chunkLength} bytes`);
          break;
        case "Finished":
          console.log("Download finished");
          break;
      }
    });

    console.log("Update installed successfully");

    // Relaunch the app to apply the update
    await relaunch();

    return true;
  } catch (error) {
    console.error("Failed to install update:", error);
    throw error;
  }
}

/**
 * Check for updates and prompt user if available
 * Returns update info if available, null otherwise
 */
export async function checkAndPromptUpdate(): Promise<UpdateInfo | null> {
  try {
    const updateInfo = await checkForUpdates();

    if (!updateInfo.available) {
      return null;
    }

    console.log(`Update available: ${updateInfo.latestVersion}`);
    return updateInfo;
  } catch (error) {
    console.error("Update check failed:", error);
    return null;
  }
}
