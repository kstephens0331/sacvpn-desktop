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
    console.log("Checking for updates...");
    const update = await check();
    console.log("Update check result:", update);

    if (update) {
      console.log("Update available:", update.version);
      return {
        available: true,
        currentVersion: update.currentVersion,
        latestVersion: update.version,
        body: update.body,
      };
    }

    console.log("No update available, current version is latest");
    return {
      available: false,
      currentVersion: "1.0.7",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to check for updates:", errorMessage);
    console.error("Full error:", error);
    throw new Error(`Update check failed: ${errorMessage}`);
  }
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
