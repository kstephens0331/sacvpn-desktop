//! WireGuard VPN implementation
//!
//! This module handles the low-level WireGuard tunnel management for different platforms.
//! - Windows: Uses wintun driver and WireGuard-NT
//! - macOS: Uses NetworkExtension framework
//! - Linux: Uses wireguard-go or kernel module

use super::{VpnConfig, VpnError};
use std::process::Command;

/// WireGuard tunnel manager
pub struct WireGuardManager {
    interface_name: String,
    is_connected: bool,
}

impl WireGuardManager {
    pub fn new() -> Self {
        Self {
            interface_name: "sacvpn0".to_string(),
            is_connected: false,
        }
    }

    /// Connect to VPN using WireGuard protocol
    pub async fn connect(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        log::info!("Connecting to WireGuard tunnel...");

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
        Ok(())
    }

    /// Disconnect from VPN
    pub async fn disconnect(&mut self) -> Result<(), VpnError> {
        log::info!("Disconnecting WireGuard tunnel...");

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
        Ok(())
    }

    /// Get transfer statistics (rx_bytes, tx_bytes)
    pub async fn get_transfer_stats(&self) -> Result<(u64, u64), VpnError> {
        if !self.is_connected {
            return Ok((0, 0));
        }

        // TODO: Implement actual stats retrieval from WireGuard interface
        // For now, return mock data
        Ok((0, 0))
    }

    // ================== Windows Implementation ==================
    #[cfg(target_os = "windows")]
    async fn connect_windows(&self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config file
        let config_content = self.generate_wg_config(config);

        // Write config to temp file
        let config_path = PathBuf::from(std::env::temp_dir()).join("sacvpn.conf");
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(e.to_string()))?;

        // Try to use WireGuard CLI if available
        // This requires WireGuard to be installed on the system
        let wireguard_path = r"C:\Program Files\WireGuard\wireguard.exe";

        if std::path::Path::new(wireguard_path).exists() {
            // Use WireGuard native client
            let output = Command::new(wireguard_path)
                .args(&["/installtunnelservice", config_path.to_str().unwrap()])
                .output()
                .map_err(|e| VpnError::WireGuardError(e.to_string()))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(VpnError::WireGuardError(format!(
                    "Failed to install tunnel: {}",
                    stderr
                )));
            }

            log::info!("WireGuard tunnel installed successfully");
        } else {
            // Fallback: Use wireguard-go or embedded implementation
            log::warn!("WireGuard not found, using fallback implementation");

            // TODO: Implement embedded WireGuard using wintun
            // For now, simulate connection
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    async fn disconnect_windows(&self) -> Result<(), VpnError> {
        let wireguard_path = r"C:\Program Files\WireGuard\wireguard.exe";

        if std::path::Path::new(wireguard_path).exists() {
            let output = Command::new(wireguard_path)
                .args(&["/uninstalltunnelservice", &self.interface_name])
                .output()
                .map_err(|e| VpnError::WireGuardError(e.to_string()))?;

            if !output.status.success() {
                log::warn!("Failed to uninstall tunnel service, may not exist");
            }
        }

        Ok(())
    }

    // ================== macOS Implementation ==================
    #[cfg(target_os = "macos")]
    async fn connect_macos(&self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config
        let config_content = self.generate_wg_config(config);

        // Write config to user's wireguard directory
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_dir = PathBuf::from(&home).join(".config").join("sacvpn");
        fs::create_dir_all(&config_dir).map_err(|e| VpnError::ConfigError(e.to_string()))?;

        let config_path = config_dir.join("sacvpn.conf");
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(e.to_string()))?;

        // Try to use wg-quick if available (requires WireGuard tools installed)
        let output = Command::new("wg-quick")
            .args(&["up", config_path.to_str().unwrap()])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                log::info!("WireGuard tunnel connected via wg-quick");
            }
            Ok(result) => {
                let stderr = String::from_utf8_lossy(&result.stderr);
                log::warn!("wg-quick failed: {}", stderr);

                // TODO: Implement NetworkExtension-based connection
                // This requires a System Extension and proper entitlements
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
            Err(e) => {
                log::warn!("wg-quick not available: {}", e);
                // Simulate connection for demo
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    async fn disconnect_macos(&self) -> Result<(), VpnError> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_path = format!("{}/.config/sacvpn/sacvpn.conf", home);

        let _ = Command::new("wg-quick")
            .args(&["down", &config_path])
            .output();

        Ok(())
    }

    // ================== Linux Implementation ==================
    #[cfg(target_os = "linux")]
    async fn connect_linux(&self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;

        // Generate WireGuard config
        let config_content = self.generate_wg_config(config);

        // Write config to /etc/wireguard (requires root) or user config dir
        let config_path = PathBuf::from("/tmp").join("sacvpn.conf");
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(e.to_string()))?;

        // Use wg-quick
        let output = Command::new("sudo")
            .args(&["wg-quick", "up", config_path.to_str().unwrap()])
            .output()
            .map_err(|e| VpnError::WireGuardError(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(VpnError::WireGuardError(format!(
                "wg-quick failed: {}",
                stderr
            )));
        }

        Ok(())
    }

    #[cfg(target_os = "linux")]
    async fn disconnect_linux(&self) -> Result<(), VpnError> {
        let config_path = "/tmp/sacvpn.conf";

        let _ = Command::new("sudo")
            .args(&["wg-quick", "down", config_path])
            .output();

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
