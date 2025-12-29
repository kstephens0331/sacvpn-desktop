//! Embedded WireGuard VPN implementation
//!
//! This module provides a fully embedded WireGuard implementation that doesn't require
//! the WireGuard application to be installed. It uses:
//! - Windows: wintun driver + boringtun for userspace WireGuard
//! - macOS/Linux: Falls back to wg-quick (can be embedded in future)

use super::{VpnConfig, VpnError};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

/// Tunnel name used for WireGuard
const TUNNEL_NAME: &str = "SACVPN";

/// WireGuard tunnel manager with embedded implementation
pub struct WireGuardManager {
    tunnel_name: String,
    is_connected: Arc<AtomicBool>,
    bytes_received: Arc<AtomicU64>,
    bytes_sent: Arc<AtomicU64>,
    #[cfg(target_os = "windows")]
    tunnel_handle: Option<std::sync::Arc<tokio::sync::Mutex<WindowsTunnel>>>,
    #[cfg(target_os = "windows")]
    config_path: Option<std::path::PathBuf>,
}

#[cfg(target_os = "windows")]
struct WindowsTunnel {
    session: Arc<wintun::Session>,
    tunnel: boringtun::noise::Tunn,
    endpoint: std::net::SocketAddr,
    socket: std::net::UdpSocket,
    running: Arc<AtomicBool>,
}

impl WireGuardManager {
    pub fn new() -> Self {
        Self {
            tunnel_name: TUNNEL_NAME.to_string(),
            is_connected: Arc::new(AtomicBool::new(false)),
            bytes_received: Arc::new(AtomicU64::new(0)),
            bytes_sent: Arc::new(AtomicU64::new(0)),
            #[cfg(target_os = "windows")]
            tunnel_handle: None,
            #[cfg(target_os = "windows")]
            config_path: None,
        }
    }

    /// Connect to VPN using embedded WireGuard protocol
    pub async fn connect(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        log::info!("Connecting to WireGuard tunnel '{}' ...", self.tunnel_name);
        log::info!("Endpoint: {}", config.peer.endpoint);
        log::info!("Client IP: {}", config.interface.address);

        #[cfg(target_os = "windows")]
        {
            self.connect_windows_embedded(config).await?;
        }

        #[cfg(target_os = "macos")]
        {
            self.connect_macos(config).await?;
        }

        #[cfg(target_os = "linux")]
        {
            self.connect_linux(config).await?;
        }

        self.is_connected.store(true, Ordering::SeqCst);
        log::info!("WireGuard tunnel connected successfully");
        Ok(())
    }

    /// Disconnect from VPN
    pub async fn disconnect(&mut self) -> Result<(), VpnError> {
        log::info!("Disconnecting WireGuard tunnel '{}'...", self.tunnel_name);

        #[cfg(target_os = "windows")]
        {
            self.disconnect_windows_embedded().await?;
        }

        #[cfg(target_os = "macos")]
        {
            self.disconnect_macos().await?;
        }

        #[cfg(target_os = "linux")]
        {
            self.disconnect_linux().await?;
        }

        self.is_connected.store(false, Ordering::SeqCst);
        log::info!("WireGuard tunnel disconnected");
        Ok(())
    }

    /// Get transfer statistics (rx_bytes, tx_bytes)
    pub async fn get_transfer_stats(&self) -> Result<(u64, u64), VpnError> {
        if !self.is_connected.load(Ordering::SeqCst) {
            return Ok((0, 0));
        }

        let rx = self.bytes_received.load(Ordering::SeqCst);
        let tx = self.bytes_sent.load(Ordering::SeqCst);
        Ok((rx, tx))
    }

    // ================== Windows Embedded Implementation ==================
    #[cfg(target_os = "windows")]
    async fn connect_windows_embedded(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use base64::Engine;
        use std::net::UdpSocket;

        log::info!("Using embedded WireGuard implementation (no external WireGuard needed)");

        // Parse private key
        let private_key_bytes = base64::engine::general_purpose::STANDARD
            .decode(&config.interface.private_key)
            .map_err(|e| VpnError::ConfigError(format!("Invalid private key: {}", e)))?;

        let private_key: [u8; 32] = private_key_bytes
            .try_into()
            .map_err(|_| VpnError::ConfigError("Private key must be 32 bytes".to_string()))?;

        // Parse peer public key
        let peer_public_key_bytes = base64::engine::general_purpose::STANDARD
            .decode(&config.peer.public_key)
            .map_err(|e| VpnError::ConfigError(format!("Invalid peer public key: {}", e)))?;

        let peer_public_key: [u8; 32] = peer_public_key_bytes
            .try_into()
            .map_err(|_| VpnError::ConfigError("Peer public key must be 32 bytes".to_string()))?;

        // Parse endpoint
        let endpoint: std::net::SocketAddr = config
            .peer
            .endpoint
            .parse()
            .map_err(|e| VpnError::ConfigError(format!("Invalid endpoint: {}", e)))?;

        // Parse client IP
        let client_ip = config
            .interface
            .address
            .split('/')
            .next()
            .ok_or_else(|| VpnError::ConfigError("Invalid client address".to_string()))?
            .parse::<std::net::Ipv4Addr>()
            .map_err(|e| VpnError::ConfigError(format!("Invalid client IP: {}", e)))?;

        // Load wintun driver from app directory
        log::info!("Loading wintun driver...");

        // Try multiple paths for wintun.dll
        let wintun = {
            // First try the current executable's directory
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()));

            let dll_paths = [
                exe_dir.as_ref().map(|d| d.join("wintun.dll")),
                exe_dir.as_ref().map(|d| d.join("resources").join("wintun.dll")),
                Some(std::path::PathBuf::from("wintun.dll")),
            ];

            let mut loaded = None;
            for path_opt in dll_paths.iter() {
                if let Some(path) = path_opt {
                    if path.exists() {
                        log::info!("Found wintun.dll at: {:?}", path);
                        match unsafe { wintun::load_from_path(path) } {
                            Ok(w) => {
                                loaded = Some(w);
                                break;
                            }
                            Err(e) => {
                                log::warn!("Failed to load wintun from {:?}: {}", path, e);
                            }
                        }
                    }
                }
            }

            // Fallback to default loading
            loaded.or_else(|| unsafe { wintun::load().ok() })
        };

        let wintun = wintun.ok_or_else(|| {
            VpnError::WireGuardError(
                "Failed to load wintun driver. The wintun.dll file is missing or corrupt.".to_string()
            )
        })?;

        // Create adapter
        log::info!("Creating network adapter '{}'...", self.tunnel_name);
        let adapter = wintun::Adapter::create(&wintun, &self.tunnel_name, "SACVPN", None).map_err(
            |e| {
                if e.to_string().contains("Access") {
                    VpnError::PermissionDenied(
                        "Administrator privileges required to create VPN tunnel".to_string(),
                    )
                } else {
                    VpnError::WireGuardError(format!("Failed to create adapter: {}", e))
                }
            },
        )?;

        // Set adapter IP address
        log::info!("Configuring adapter with IP {}...", client_ip);
        self.configure_adapter_ip(&adapter, client_ip)?;

        // Start session (wrapped in Arc as required by wintun API)
        let session = Arc::new(
            adapter
                .start_session(wintun::MAX_RING_CAPACITY)
                .map_err(|e| VpnError::WireGuardError(format!("Failed to start session: {}", e)))?,
        );

        // Create WireGuard tunnel using boringtun
        log::info!("Initializing WireGuard crypto...");
        let tunnel = boringtun::noise::Tunn::new(
            boringtun::x25519::StaticSecret::from(private_key),
            boringtun::x25519::PublicKey::from(peer_public_key),
            None, // Preshared key
            config.peer.persistent_keepalive.map(|k| k as u16),
            0,    // Tunnel index
            None, // Rate limiter
        )
        .map_err(|e| VpnError::WireGuardError(format!("Failed to create tunnel: {}", e)))?;

        // Create UDP socket for WireGuard traffic
        log::info!("Creating UDP socket for WireGuard traffic...");
        let socket = UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| VpnError::WireGuardError(format!("Failed to bind UDP socket: {}", e)))?;

        socket.connect(endpoint).map_err(|e| {
            VpnError::WireGuardError(format!("Failed to connect to endpoint: {}", e))
        })?;

        socket
            .set_nonblocking(true)
            .map_err(|e| VpnError::WireGuardError(format!("Failed to set non-blocking: {}", e)))?;

        // Store tunnel handle
        let running = Arc::new(AtomicBool::new(true));
        let tunnel_state = WindowsTunnel {
            session,
            tunnel,
            endpoint,
            socket,
            running: running.clone(),
        };

        self.tunnel_handle = Some(Arc::new(tokio::sync::Mutex::new(tunnel_state)));

        // Start packet forwarding tasks
        self.start_packet_forwarding(running).await?;

        // Configure routing
        self.configure_routing(&config.peer.allowed_ips)?;

        log::info!("Embedded WireGuard tunnel established successfully!");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn configure_adapter_ip(
        &self,
        adapter: &wintun::Adapter,
        ip: std::net::Ipv4Addr,
    ) -> Result<(), VpnError> {
        use std::process::Command;

        // Get adapter GUID
        let luid = adapter.get_luid();

        // Use netsh to set IP (simpler and more reliable)
        let output = Command::new("netsh")
            .args([
                "interface",
                "ip",
                "set",
                "address",
                &self.tunnel_name,
                "static",
                &ip.to_string(),
                "255.255.255.0",
            ])
            .output()
            .map_err(|e| VpnError::WireGuardError(format!("Failed to configure IP: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("netsh IP config warning: {}", stderr);
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    async fn start_packet_forwarding(&self, running: Arc<AtomicBool>) -> Result<(), VpnError> {
        let tunnel_handle = self
            .tunnel_handle
            .as_ref()
            .ok_or(VpnError::NotConnected)?
            .clone();

        let bytes_received = self.bytes_received.clone();
        let bytes_sent = self.bytes_sent.clone();

        // Spawn packet forwarding task
        tokio::spawn(async move {
            log::info!("Starting packet forwarding...");

            let mut buf = [0u8; 65536];
            let mut wg_buf = [0u8; 65536];

            while running.load(Ordering::SeqCst) {
                let mut tunnel = tunnel_handle.lock().await;

                // Read from TUN and send to WireGuard
                if let Ok(packet) = tunnel.session.try_receive() {
                    if let Some(packet) = packet {
                        let packet_data = packet.bytes();
                        bytes_sent.fetch_add(packet_data.len() as u64, Ordering::SeqCst);

                        // Encrypt and send
                        match tunnel.tunnel.encapsulate(packet_data, &mut wg_buf) {
                            boringtun::noise::TunnResult::WriteToNetwork(data) => {
                                let _ = tunnel.socket.send(data);
                            }
                            _ => {}
                        }
                    }
                }

                // Read from WireGuard and write to TUN
                match tunnel.socket.recv(&mut buf) {
                    Ok(n) => {
                        bytes_received.fetch_add(n as u64, Ordering::SeqCst);

                        // Decrypt and write to TUN
                        match tunnel.tunnel.decapsulate(None, &buf[..n], &mut wg_buf) {
                            boringtun::noise::TunnResult::WriteToTunnelV4(data, _) => {
                                if let Ok(mut write_pack) =
                                    tunnel.session.allocate_send_packet(data.len() as u16)
                                {
                                    write_pack.bytes_mut().copy_from_slice(data);
                                    tunnel.session.send_packet(write_pack);
                                }
                            }
                            boringtun::noise::TunnResult::WriteToNetwork(data) => {
                                let _ = tunnel.socket.send(data);
                            }
                            _ => {}
                        }
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        // No data available, continue
                    }
                    Err(e) => {
                        log::warn!("Socket error: {}", e);
                    }
                }

                // Send keepalive if needed
                match tunnel.tunnel.update_timers(&mut wg_buf) {
                    boringtun::noise::TunnResult::WriteToNetwork(data) => {
                        let _ = tunnel.socket.send(data);
                    }
                    _ => {}
                }

                drop(tunnel);
                tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;
            }

            log::info!("Packet forwarding stopped");
        });

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn configure_routing(&self, allowed_ips: &[String]) -> Result<(), VpnError> {
        use std::process::Command;

        for allowed_ip in allowed_ips {
            if allowed_ip == "0.0.0.0/0" {
                // Route all traffic through VPN
                log::info!("Configuring default route through VPN...");

                // Add route for 0.0.0.0/1 and 128.0.0.0/1 to capture all traffic
                // This is a common trick to avoid replacing the default gateway
                let _ = Command::new("route")
                    .args([
                        "add",
                        "0.0.0.0",
                        "mask",
                        "128.0.0.0",
                        "10.70.0.1",
                        "metric",
                        "1",
                    ])
                    .output();

                let _ = Command::new("route")
                    .args([
                        "add",
                        "128.0.0.0",
                        "mask",
                        "128.0.0.0",
                        "10.70.0.1",
                        "metric",
                        "1",
                    ])
                    .output();
            }
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    async fn disconnect_windows_embedded(&mut self) -> Result<(), VpnError> {
        use std::process::Command;

        log::info!("Stopping embedded WireGuard tunnel...");

        // Stop the packet forwarding
        if let Some(ref handle) = self.tunnel_handle {
            let tunnel = handle.lock().await;
            tunnel.running.store(false, Ordering::SeqCst);
        }

        // Remove routes
        let _ = Command::new("route")
            .args(["delete", "0.0.0.0", "mask", "128.0.0.0"])
            .output();
        let _ = Command::new("route")
            .args(["delete", "128.0.0.0", "mask", "128.0.0.0"])
            .output();

        // Drop the tunnel handle (this closes the adapter)
        self.tunnel_handle = None;

        // Reset stats
        self.bytes_received.store(0, Ordering::SeqCst);
        self.bytes_sent.store(0, Ordering::SeqCst);

        log::info!("Embedded WireGuard tunnel disconnected");
        Ok(())
    }

    // ================== macOS Implementation (fallback to wg-quick) ==================
    #[cfg(target_os = "macos")]
    async fn connect_macos(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;
        use std::process::Command;

        let config_content = self.generate_wg_config(config);

        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_dir = PathBuf::from(&home).join(".config").join("sacvpn");
        fs::create_dir_all(&config_dir)
            .map_err(|e| VpnError::ConfigError(format!("Failed to create config dir: {}", e)))?;

        let config_path = config_dir.join(format!("{}.conf", self.tunnel_name));
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(format!("Failed to write config: {}", e)))?;

        let output = Command::new("wg-quick")
            .args(["up", config_path.to_str().unwrap()])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                log::info!("WireGuard tunnel connected via wg-quick");
                Ok(())
            }
            Ok(result) => {
                let stderr = String::from_utf8_lossy(&result.stderr);
                if stderr.contains("Operation not permitted") {
                    Err(VpnError::PermissionDenied(
                        "WireGuard requires root privileges".to_string(),
                    ))
                } else {
                    Err(VpnError::WireGuardError(format!(
                        "wg-quick failed: {}",
                        stderr
                    )))
                }
            }
            Err(e) => Err(VpnError::WireGuardError(format!(
                "WireGuard tools not found: {}",
                e
            ))),
        }
    }

    #[cfg(target_os = "macos")]
    async fn disconnect_macos(&mut self) -> Result<(), VpnError> {
        use std::process::Command;

        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let config_path = format!("{}/.config/sacvpn/{}.conf", home, self.tunnel_name);

        let _ = Command::new("wg-quick").args(["down", &config_path]).output();
        Ok(())
    }

    // ================== Linux Implementation ==================
    #[cfg(target_os = "linux")]
    async fn connect_linux(&mut self, config: &VpnConfig) -> Result<(), VpnError> {
        use std::fs;
        use std::path::PathBuf;
        use std::process::Command;

        let config_content = self.generate_wg_config(config);
        let config_path = PathBuf::from("/tmp").join(format!("{}.conf", self.tunnel_name));
        fs::write(&config_path, &config_content)
            .map_err(|e| VpnError::ConfigError(format!("Failed to write config: {}", e)))?;

        let output = Command::new("pkexec")
            .args(["wg-quick", "up", config_path.to_str().unwrap()])
            .output()
            .or_else(|_| {
                Command::new("sudo")
                    .args(["wg-quick", "up", config_path.to_str().unwrap()])
                    .output()
            })
            .map_err(|e| VpnError::WireGuardError(format!("Failed to run wg-quick: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("Permission denied") {
                return Err(VpnError::PermissionDenied(
                    "WireGuard requires root privileges".to_string(),
                ));
            }
            return Err(VpnError::WireGuardError(format!(
                "wg-quick failed: {}",
                stderr
            )));
        }

        Ok(())
    }

    #[cfg(target_os = "linux")]
    async fn disconnect_linux(&mut self) -> Result<(), VpnError> {
        use std::process::Command;

        let config_path = format!("/tmp/{}.conf", self.tunnel_name);
        let _ = Command::new("pkexec")
            .args(["wg-quick", "down", &config_path])
            .output()
            .or_else(|_| Command::new("sudo").args(["wg-quick", "down", &config_path]).output());
        Ok(())
    }

    // ================== Helper Functions ==================

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
