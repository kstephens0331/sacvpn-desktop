# Publishing Updates to SACVPN Desktop App

This guide explains how to publish updates that will be automatically delivered to users.

## How Auto-Updates Work

1. **User opens the app** → App checks GitHub Releases for new version
2. **If update available** → Shows notification with release notes
3. **User clicks "Install"** → Downloads and installs update automatically
4. **App relaunches** → User is now on the latest version ✅

## Prerequisites

- GitHub repository set up for the desktop app
- GitHub account with push access to the repository
- Production build of the new version

## Step-by-Step Release Process

### 1. Update Version Number

Edit `src-tauri/tauri.conf.json`:

```json
{
  "version": "1.0.1"  // Increment this (was 1.0.0)
}
```

Also update `src-tauri/Cargo.toml`:

```toml
[package]
version = "1.0.1"  # Match the tauri.conf.json version
```

### 2. Commit and Tag the Release

```bash
git add .
git commit -m "Release v1.0.1: Add server list and auto-updates"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 3. Build the Production App

```bash
npm run tauri build
```

This creates:
- `C:\cargo-target\sacvpn-desktop\release\sacvpn-desktop.exe` - The main executable
- `C:\cargo-target\sacvpn-desktop\release\bundle\msi\SACVPN_1.0.1_x64_en-US.msi` - Windows installer

### 4. Create GitHub Release

**Option A: Using GitHub CLI (Recommended)**

```bash
# Install GitHub CLI if you haven't: winget install GitHub.cli

# Create release with assets
gh release create v1.0.1 \
  --title "v1.0.1 - Server List & Auto-Updates" \
  --notes "## What's New
- Added VPN server list with 2 locations
- Implemented auto-update functionality
- Fixed OneDrive build issues
- Improved UI and performance

## Installation
Download and run the .msi installer below." \
  "C:/cargo-target/sacvpn-desktop/release/bundle/msi/SACVPN_1.0.1_x64_en-US.msi"
```

**Option B: Using GitHub Web Interface**

1. Go to https://github.com/YOUR_USERNAME/sacvpn-desktop/releases
2. Click **"Draft a new release"**
3. Tag: `v1.0.1`
4. Title: `v1.0.1 - Server List & Auto-Updates`
5. Description: Write release notes (what's new, what's fixed)
6. Upload files:
   - Drag and drop: `SACVPN_1.0.1_x64_en-US.msi`
7. Click **"Publish release"**

### 5. Tauri Update Manifest (Automatic)

When you create a GitHub release, Tauri automatically generates a `latest.json` file that includes:
- Version number
- Download URL
- Release notes
- File signatures

This file is what the app checks to see if updates are available.

## Testing the Update

### Test in Development:

```bash
# Temporarily change version to 1.0.0 in tauri.conf.json
npm run tauri dev
# The app should detect v1.0.1 is available and show update notification
```

### Test in Production:

1. Install the current version (v1.0.0)
2. Publish new version (v1.0.1) to GitHub
3. Open the installed app
4. After 5 seconds, you should see the update notification
5. Click "Install Now"
6. App downloads, installs, and relaunches with new version ✅

## Update Notification UI

When an update is available, users see:
- **Notification** in top-right corner
- **Version number** (e.g., "Version 1.0.1")
- **Release notes** from GitHub release
- **"Install Now"** button (downloads & installs automatically)
- **"Later"** button (dismisses notification)

## Rollback Process

If you need to rollback an update:

1. Delete the problematic release from GitHub
2. Re-create the previous stable release as "latest"
3. Users will be offered to "update" to the stable version

## Versioning Guidelines

Use [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features (backwards compatible)
- **Patch** (1.0.0 → 1.0.1): Bug fixes

## Release Checklist

Before publishing:

- [ ] Version bumped in `tauri.conf.json`
- [ ] Version bumped in `Cargo.toml`
- [ ] Release notes written
- [ ] Production build tested
- [ ] Commit tagged with version
- [ ] GitHub release created
- [ ] .msi installer uploaded

## Troubleshooting

### Update not detected

- Check GitHub release is published (not draft)
- Verify `.msi` file is attached to release
- Check app version is lower than release version
- Look for errors in browser console (F12)

### Download fails

- Ensure `.msi` file is publicly accessible
- Check GitHub repository is public (or release assets are public)
- Verify internet connection

### Installation fails

- Check Windows SmartScreen didn't block it
- Verify .msi file isn't corrupted
- Try downloading .msi manually and installing

## Future Enhancements

**Code Signing (Recommended for production):**
- Sign your .msi with a code signing certificate
- Eliminates Windows SmartScreen warnings
- Increases user trust

**Staged Rollouts:**
- Release to subset of users first
- Monitor for issues before full rollout

**Beta Channel:**
- Separate update channel for beta testers
- Test features before releasing to all users

## Configuration Reference

**Updater config location:** `src-tauri/tauri.conf.json`

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,  // Shows built-in dialog (we use custom UI)
      "endpoints": [
        "https://github.com/YOUR_USERNAME/sacvpn-desktop/releases/latest/download/latest.json"
      ],
      "pubkey": "",  // Not needed for GitHub Releases
      "windows": {
        "installMode": "passive"  // Silent install
      }
    }
  }
}
```

**Update checking code:** `src/services/updater.ts`
**Update UI:** `src/components/UpdateNotification.tsx`

---

**Need help?** Check the [Tauri Updater Documentation](https://v2.tauri.app/plugin/updater/)
