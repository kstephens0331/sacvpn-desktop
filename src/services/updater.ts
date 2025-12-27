import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  body?: string;
}

/**
 * Check for available updates from GitHub Releases
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const update = await check();

    if (update?.available) {
      return {
        available: true,
        currentVersion: update.currentVersion,
        latestVersion: update.version,
        body: update.body,
      };
    }

    return {
      available: false,
      currentVersion: update?.currentVersion || "1.0.0",
    };
  } catch (error) {
    console.error("Failed to check for updates:", error);
    throw error;
  }
}

/**
 * Download and install available update
 * Returns true if update was installed successfully
 */
export async function downloadAndInstall(): Promise<boolean> {
  try {
    const update = await check();

    if (!update?.available) {
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
