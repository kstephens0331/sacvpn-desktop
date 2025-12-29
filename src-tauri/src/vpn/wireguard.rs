//! WireGuard VPN implementation
//!
//! This module handles the low-level WireGuard tunnel management for different platforms.
//! - Windows: Uses WireGuard CLI with tunnel service
//! - macOS: Uses wg-quick or NetworkExtension framework
//! - Linux: Uses wg-quick with kernel module

use super::{VpnConfig, VpnError};
use std::process::Command;

/// Tunnel name used for WireGuard (must match config filename without .conf)
const TUNNEL_NAME: &str = "sacvpn";

/// WireGuard tunnel manager
pub struct WireGuardManager {
    tunnel_name: String,
    is_connected: bool,
    #[cfg(target_os = "windows")]
    config_path: Option<std::path::PathBuf>,
}

impl WireGuardManager {
    pub fn new() -> Self {
        Self {
            tunnel_name: TUNNEL_NAME.to_string(),
            is_connected: false,
            #[cfg(target_os = "windows")]
            config_path: None,
        }
    }

    /// Connect to VPN using WireGuard protocol
    pub async fn connect(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        log::info!("Connecting to WireGuard tunnel '{}' ...", self.tunnel_name);
        log::info!("Endpoint: {}", config.peer.endpoint);
        log::info!("Client IP: {}", config.interface.address);

        #[cfg(target_os = "windows")]
        {
            self.connect_windows(config).await?;
        }

        #[cfg(target_os = "macos")]
        {
            self.connect_macos(config).await?;
        }

        #[cfg(target_os = "linux")]
        {
            self.connect_linux(config).await?;
        }

        self.is_connected = true;
        log::info!("WireGuard tunnel connected successfully");
        Ok(())
    }

    /// Disconnect from VPN
    pub async fn disconnect(&mut self) -> Result<(), VpnError> {
        log::info!("Disconnecting WireGuard tunnel '{}'...", self.tunnel_name);

        #[cfg(target_os = "windows")]
        {
            self.disconnect_windows().await?;
        }

        #[cfg(target_os = "macos")]
        {
            self.disconnect_macos().await?;
        }

        #[cfg(target_os = "linux")]
        {
            self.disconnect_linux().await?;
        }

        self.is_connected = false;
        log::info!("WireGuard tunnel disconnected");
        Ok(())
    }

    /// Get transfer statistics (rx_bytes, tx_bytes)
    pub async fn get_transfer_stats(&self) -> Result<(u64, u64), VpnError> {
        if !self.is_connected {
            return Ok((0, 0));
        }

        #[cfg(target_os = "windows")]
        {
            return self.get_stats_windows().await;
        }

        #[cfg(target_os = "macos")]
        {
            return self.get_stats_macos().await;
        }

        #[cfg(target_os = "linux")]
        {
            return self.get_stats_linux().await;
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Ok((0, 0))
        }
    }

    #[cfg(target_os = "windows")]
    async fn get_stats_windows(&self) -> Result<(u64, u64), VpnError> {
        // Try to get stats from WireGuard CLI
        let output = Command::new("wg")
            .args(["show", &self.tunnel_name, "transfer"])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                // Parse output format: "peer_pubkey\trx_bytes\ttx_bytes"
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 3 {
                        let rx = parts[1].parse::<u64>().unwrap_or(0);
                        let tx = parts[2].parse::<u64>().unwrap_or(0);
                        return Ok((rx, tx));
                    }
                }
                Ok((0, 0))
            }
            _ => Ok((0, 0)),
        }
    }

    #[cfg(target_os = "macos")]
    async fn get_stats_macos(&self) -> Result<(u64, u64), VpnError> {
        let output = Command::new("wg")
            .args(["show", &self.tunnel_name, "transfer"])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 3 {
                        let rx = parts[1].parse::<u64>().unwrap_or(0);
                        let tx = parts[2].parse::<u64>().unwrap_or(0);
                        return Ok((rx, tx));
                    }
                }
                Ok((0, 0))
            }
            _ => Ok((0, 0)),
        }
    }

    #[cfg(target_os = "linux")]
    async fn get_stats_linux(&self) -> Result<(u64, u64), VpnError> {
        let output = Command::new("wg")
            .args(["show", &self.tunnel_name, "transfer"])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                for line in stdout.lines() {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 3 {
                        let rx = parts[1].parse::<u64>().unwrap_or(0);
                        let tx = parts[2].parse::<u64>().unwrap_or(0);
                        return Ok((rx, tx));
                    }
                }
                Ok((0, 0))
            }
            _ => Ok((0, 0)),
        }
    }

    // ================== Windows Implementation ==================
    #[cfg(target_os = "windows")]
    async fn connect_windows(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config file
        let config_content = self.generate_wg_config(config);

        // Write config to temp file - filename determines tunnel name
        let config_path = PathBuf::from(std::env::temp_dir()).join(format!("{}.conf", TUNNEL_NAME));
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(format!("Failed to write config: {}", e)))?;

        self.config_path = Some(config_path.clone());

        log::info!("WireGuard config written to: {:?}", config_path);
        log::info!("Config content:\n{}", config_content);

        // Try multiple WireGuard installation paths
        let wireguard_paths = [
            r"C:\Program Files\WireGuard\wireguard.exe",
            r"C:\Program Files (x86)\WireGuard\wireguard.exe",
        ];

        let wireguard_path = wireguard_paths
            .iter()
            .find(|p| std::path::Path::new(p).exists());

        if let Some(wg_path) = wireguard_path {
            log::info!("Found WireGuard at: {}", wg_path);

            // First, try to uninstall any existing tunnel with same name
            let _ = Command::new(wg_path)
                .args(["/uninstalltunnelservice", &self.tunnel_name])
                .output();

            // Small delay to ensure cleanup
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

            // Install the tunnel service
            let output = Command::new(wg_path)
                .args(["/installtunnelservice", config_path.to_str().unwrap()])
                .output()
                .map_err(|e| VpnError::WireGuardError(format!("Failed to run WireGuard: {}", e)))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                log::error!("WireGuard install failed - stdout: {}, stderr: {}", stdout, stderr);

                // Check if it's a permission error
                if stderr.contains("Access is denied") || stderr.contains("administrator") {
                    return Err(VpnError::PermissionDenied(
                        "WireGuard requires administrator privileges. Please run as administrator.".to_string()
                    ));
                }

                return Err(VpnError::WireGuardError(format!(
                    "Failed to install tunnel: {}",
                    if stderr.is_empty() { stdout.to_string() } else { stderr.to_string() }
                )));
            }

            log::info!("WireGuard tunnel '{}' installed successfully", self.tunnel_name);

            // Wait a moment for the tunnel to establish
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

            // Verify connection by checking if interface exists
            let verify = Command::new("wg")
                .args(["show", &self.tunnel_name])
                .output();

            match verify {
                Ok(result) if result.status.success() => {
                    log::info!("WireGuard tunnel verified and active");
                }
                _ => {
                    log::warn!("Could not verify tunnel status, but installation succeeded");
                }
            }
        } else {
            // WireGuard not installed
            return Err(VpnError::WireGuardError(
                "WireGuard is not installed. Please install WireGuard from https://www.wireguard.com/install/".to_string()
            ));
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    async fn disconnect_windows(&mut self) -> Result<(), VpnError> {
        let wireguard_paths = [
            r"C:\Program Files\WireGuard\wireguard.exe",
            r"C:\Program Files (x86)\WireGuard\wireguard.exe",
        ];

        let wireguard_path = wireguard_paths
            .iter()
            .find(|p| std::path::Path::new(p).exists());

        if let Some(wg_path) = wireguard_path {
            log::info!("Disconnecting WireGuard tunnel: {}", self.tunnel_name);

            let output = Command::new(wg_path)
                .args(["/uninstalltunnelservice", &self.tunnel_name])
                .output()
                .map_err(|e| VpnError::WireGuardError(format!("Failed to run WireGuard: {}", e)))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                log::warn!("Tunnel uninstall returned error (may not exist): {}", stderr);
            } else {
                log::info!("WireGuard tunnel '{}' disconnected", self.tunnel_name);
            }

            // Clean up config file
            if let Some(ref config_path) = self.config_path {
                let _ = std::fs::remove_file(config_path);
            }
            self.config_path = None;
        }

        Ok(())
    }

    // ================== macOS Implementation ==================
    #[cfg(target_os = "macos")]
    async fn connect_macos(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config
        let config_content = self.generate_wg_config(config);

        // Write config to user's wireguard directory
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_dir = PathBuf::from(&home).join(".config").join("sacvpn");
        fs::create_dir_all(&config_dir)
            .map_err(|e| VpnError::ConfigError(format!("Failed to create config dir: {}", e)))?;

        let config_path = config_dir.join(format!("{}.conf", TUNNEL_NAME));
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(format!("Failed to write config: {}", e)))?;

        log::info!("WireGuard config written to: {:?}", config_path);

        // Try to use wg-quick if available (requires WireGuard tools installed via brew)
        let output = Command::new("wg-quick")
            .args(["up", config_path.to_str().unwrap()])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                log::info!("WireGuard tunnel connected via wg-quick");
            }
            Ok(result) => {
                let stderr = String::from_utf8_lossy(&result.stderr);
                if stderr.contains("Operation not permitted") {
                    return Err(VpnError::PermissionDenied(
                        "WireGuard requires root privileges. Please run with sudo.".to_string()
                    ));
                }
                return Err(VpnError::WireGuardError(format!("wg-quick failed: {}", stderr)));
            }
            Err(e) => {
                return Err(VpnError::WireGuardError(format!(
                    "WireGuard tools not found. Install with: brew install wireguard-tools. Error: {}", e
                )));
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    async fn disconnect_macos(&mut self) -> Result<(), VpnError> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_path = format!("{}/.config/sacvpn/{}.conf", home, TUNNEL_NAME);

        log::info!("Disconnecting WireGuard tunnel: {}", self.tunnel_name);

        let output = Command::new("wg-quick")
            .args(["down", &config_path])
            .output();

        match output {
            Ok(result) if !result.status.success() => {
                let stderr = String::from_utf8_lossy(&result.stderr);
                log::warn!("wg-quick down returned error: {}", stderr);
            }
            Err(e) => {
                log::warn!("Failed to run wg-quick: {}", e);
            }
            _ => {
                log::info!("WireGuard tunnel disconnected");
            }
        }

        Ok(())
    }

    // ================== Linux Implementation ==================
    #[cfg(target_os = "linux")]
    async fn connect_linux(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config
        let config_content = self.generate_wg_config(config);

        // Write config to /tmp (user-accessible)
        let config_path = PathBuf::from("/tmp").join(format!("{}.conf", TUNNEL_NAME));
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(format!("Failed to write config: {}", e)))?;

        log::info!("WireGuard config written to: {:?}", config_path);

        // Use wg-quick with pkexec for graphical privilege escalation
        let output = Command::new("pkexec")
            .args(["wg-quick", "up", config_path.to_str().unwrap()])
            .output()
            .or_else(|_| {
                // Fallback to sudo if pkexec not available
                Command::new("sudo")
                    .args(["wg-quick", "up", config_path.to_str().unwrap()])
                    .output()
            })
            .map_err(|e| VpnError::WireGuardError(format!("Failed to run wg-quick: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("Operation not permitted") || stderr.contains("Permission denied") {
                return Err(VpnError::PermissionDenied(
                    "WireGuard requires root privileges.".to_string()
                ));
            }
            return Err(VpnError::WireGuardError(format!("wg-quick failed: {}", stderr)));
        }

        log::info!("WireGuard tunnel connected");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    async fn disconnect_linux(&mut self) -> Result<(), VpnError> {
        let config_path = format!("/tmp/{}.conf", TUNNEL_NAME);

        log::info!("Disconnecting WireGuard tunnel");

        let _ = Command::new("pkexec")
            .args(["wg-quick", "down", &config_path])
            .output()
            .or_else(|_| {
                Command::new("sudo")
                    .args(["wg-quick", "down", &config_path])
                    .output()
            });

        Ok(())
    }

    // ================== Helper Functions ==================

    /// Generate WireGuard configuration file content
    fn generate_wg_config(&self, config: &VpnConfig) -> String {
        let dns = config.interface.dns.join(", ");
        let allowed_ips = config.peer.allowed_ips.join(", ");

        let mut wg_config = format!(
            r#"[Interface]
PrivateKey = {}
Address = {}
DNS = {}
"#,
            config.interface.private_key, config.interface.address, dns
        );

        if let Some(mtu) = config.interface.mtu {
            wg_config.push_str(&format!("MTU = {}\n", mtu));
        }

        wg_config.push_str(&format!(
            r#"
[Peer]
PublicKey = {}
Endpoint = {}
AllowedIPs = {}
"#,
            config.peer.public_key, config.peer.endpoint, allowed_ips
        ));

        if let Some(keepalive) = config.peer.persistent_keepalive {
            wg_config.push_str(&format!("PersistentKeepalive = {}\n", keepalive));
        }

        wg_config
    }
}

impl Default for WireGuardManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_wg_config() {
        let manager = WireGuardManager::new();
        let config = VpnConfig {
            interface: super::super::InterfaceConfig {
                private_key: "test_private_key".to_string(),
                address: "10.0.0.2/24".to_string(),
                dns: vec!["1.1.1.1".to_string(), "8.8.8.8".to_string()],
                mtu: Some(1420),
            },
            peer: super::super::PeerConfig {
                public_key: "test_public_key".to_string(),
                endpoint: "vpn.sacvpn.com:51820".to_string(),
                allowed_ips: vec!["0.0.0.0/0".to_string(), "::/0".to_string()],
                persistent_keepalive: Some(25),
            },
        };

        let wg_config = manager.generate_wg_config(&config);
        assert!(wg_config.contains("PrivateKey = test_private_key"));
        assert!(wg_config.contains("PublicKey = test_public_key"));
        assert!(wg_config.contains("Endpoint = vpn.sacvpn.com:51820"));
    }
}
