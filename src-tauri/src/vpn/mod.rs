mod wireguard;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;

#[derive(Debug, Error)]
pub enum VpnError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Disconnection failed: {0}")]
    DisconnectionFailed(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Not connected")]
    NotConnected,

    #[error("Already connected")]
    AlreadyConnected,

    #[error("Platform not supported")]
    PlatformNotSupported,

    #[error("WireGuard error: {0}")]
    WireGuardError(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VpnStatus {
    Disconnected,
    Connecting,
    Connected,
    Disconnecting,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnConfig {
    pub interface: InterfaceConfig,
    pub peer: PeerConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceConfig {
    pub private_key: String,
    pub address: String,
    pub dns: Vec<String>,
    pub mtu: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerConfig {
    pub public_key: String,
    pub endpoint: String,
    pub allowed_ips: Vec<String>,
    pub persistent_keepalive: Option<u32>,
}

#[derive(Debug, Clone, Default)]
pub struct ConnectionStats {
    pub upload_speed: u64,
    pub download_speed: u64,
    pub total_uploaded: u64,
    pub total_downloaded: u64,
    pub connected_since: Option<i64>,
}

pub struct VpnManager {
    status: Arc<RwLock<VpnStatus>>,
    stats: Arc<RwLock<ConnectionStats>>,
    current_config: Arc<RwLock<Option<VpnConfig>>>,
    wireguard: wireguard::WireGuardManager,
}

impl VpnManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(RwLock::new(VpnStatus::Disconnected)),
            stats: Arc::new(RwLock::new(ConnectionStats::default())),
            current_config: Arc::new(RwLock::new(None)),
            wireguard: wireguard::WireGuardManager::new(),
        }
    }

    pub async fn connect(&mut self, config: VpnConfig) -> Result<(), VpnError> {
        let current_status = self.status.read().await.clone();
        if current_status == VpnStatus::Connected {
            return Err(VpnError::AlreadyConnected);
        }

        // Update status to connecting
        *self.status.write().await = VpnStatus::Connecting;

        // Store config
        *self.current_config.write().await = Some(config.clone());

        // Connect via WireGuard
        match self.wireguard.connect(&config).await {
            Ok(()) => {
                *self.status.write().await = VpnStatus::Connected;

                // Initialize stats
                let mut stats = self.stats.write().await;
                stats.connected_since = Some(chrono::Utc::now().timestamp());
                stats.total_uploaded = 0;
                stats.total_downloaded = 0;

                log::info!("VPN connected successfully");
                Ok(())
            }
            Err(e) => {
                *self.status.write().await = VpnStatus::Error(e.to_string());
                Err(e)
            }
        }
    }

    pub async fn disconnect(&mut self) -> Result<(), VpnError> {
        let current_status = self.status.read().await.clone();
        if current_status == VpnStatus::Disconnected {
            return Err(VpnError::NotConnected);
        }

        // Update status to disconnecting
        *self.status.write().await = VpnStatus::Disconnecting;

        // Disconnect WireGuard
        match self.wireguard.disconnect().await {
            Ok(()) => {
                *self.status.write().await = VpnStatus::Disconnected;
                *self.current_config.write().await = None;

                // Reset stats
                *self.stats.write().await = ConnectionStats::default();

                log::info!("VPN disconnected successfully");
                Ok(())
            }
            Err(e) => {
                *self.status.write().await = VpnStatus::Error(e.to_string());
                Err(e)
            }
        }
    }

    pub fn get_status(&self) -> VpnStatus {
        // For synchronous access, we need to block
        futures::executor::block_on(async { self.status.read().await.clone() })
    }

    pub fn get_stats(&self) -> ConnectionStats {
        futures::executor::block_on(async { self.stats.read().await.clone() })
    }

    pub async fn update_stats(&self) -> Result<(), VpnError> {
        let status = self.status.read().await.clone();
        if status != VpnStatus::Connected {
            return Ok(());
        }

        // Get stats from WireGuard
        if let Ok((rx, tx)) = self.wireguard.get_transfer_stats().await {
            let mut stats = self.stats.write().await;

            // Calculate speeds (bytes per second)
            let old_rx = stats.total_downloaded;
            let old_tx = stats.total_uploaded;

            stats.total_downloaded = rx;
            stats.total_uploaded = tx;

            stats.download_speed = rx.saturating_sub(old_rx);
            stats.upload_speed = tx.saturating_sub(old_tx);
        }

        Ok(())
    }
}

impl Default for VpnManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_vpn_manager_new() {
        let manager = VpnManager::new();
        assert_eq!(manager.get_status(), VpnStatus::Disconnected);
    }
}
