// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod vpn;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use vpn::{VpnConfig, VpnManager, VpnStatus};

#[derive(Debug, Serialize, Deserialize)]
pub struct Server {
    id: String,
    name: String,
    country: String,
    country_code: String,
    city: String,
    ip: String,
    public_key: String,
    load: u8,
    latency: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionStats {
    upload_speed: u64,
    download_speed: u64,
    total_uploaded: u64,
    total_downloaded: u64,
    connected_since: Option<i64>,
}

// Initialize VPN manager
static VPN_MANAGER: std::sync::OnceLock<tokio::sync::Mutex<VpnManager>> =
    std::sync::OnceLock::new();

fn get_vpn_manager() -> &'static tokio::sync::Mutex<VpnManager> {
    VPN_MANAGER.get_or_init(|| tokio::sync::Mutex::new(VpnManager::new()))
}

// Tauri commands
#[tauri::command]
async fn connect_vpn(server_id: String, config: VpnConfig) -> Result<(), String> {
    log::info!("Connecting to VPN server: {}", server_id);

    let manager = get_vpn_manager();
    let mut vpn = manager.lock().await;

    vpn.connect(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn disconnect_vpn() -> Result<(), String> {
    log::info!("Disconnecting from VPN");

    let manager = get_vpn_manager();
    let mut vpn = manager.lock().await;

    vpn.disconnect().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_vpn_status() -> Result<VpnStatus, String> {
    let manager = get_vpn_manager();
    let vpn = manager.lock().await;

    Ok(vpn.get_status())
}

#[tauri::command]
async fn get_connection_stats() -> Result<ConnectionStats, String> {
    let manager = get_vpn_manager();
    let vpn = manager.lock().await;

    let stats = vpn.get_stats();
    Ok(ConnectionStats {
        upload_speed: stats.upload_speed,
        download_speed: stats.download_speed,
        total_uploaded: stats.total_uploaded,
        total_downloaded: stats.total_downloaded,
        connected_since: stats.connected_since,
    })
}

#[tauri::command]
async fn fetch_servers(api_url: String, token: String) -> Result<Vec<Server>, String> {
    log::info!("Fetching servers from API");

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/vpn/servers", api_url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let servers: Vec<Server> = response.json().await.map_err(|e| e.to_string())?;
    Ok(servers)
}

#[tauri::command]
async fn generate_config(
    api_url: String,
    token: String,
    server_id: String,
) -> Result<VpnConfig, String> {
    log::info!("Generating config for server: {}", server_id);

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/vpn/config", api_url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({ "serverId": server_id }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let config: VpnConfig = response.json().await.map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
async fn store_credentials(email: String, token: String) -> Result<(), String> {
    let entry = keyring::Entry::new("sacvpn", &email).map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_credentials(email: String) -> Result<String, String> {
    let entry = keyring::Entry::new("sacvpn", &email).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_credentials(email: String) -> Result<(), String> {
    let entry = keyring::Entry::new("sacvpn", &email).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())?;
    Ok(())
}

fn setup_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let quit = MenuItem::with_id(app, "quit", "Quit SACVPN", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let connect = MenuItem::with_id(app, "connect", "Quick Connect", true, None::<&str>)?;
    let disconnect = MenuItem::with_id(app, "disconnect", "Disconnect", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &connect, &disconnect, &quit])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("SACVPN - Disconnected")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "connect" => {
                // TODO: Implement quick connect
                log::info!("Quick connect requested");
            }
            "disconnect" => {
                // TODO: Implement disconnect
                log::info!("Disconnect requested");
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn main() {
    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    log::info!("Starting SACVPN Desktop v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Setup system tray
            if let Err(e) = setup_tray(app) {
                log::error!("Failed to setup tray: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connect_vpn,
            disconnect_vpn,
            get_vpn_status,
            get_connection_stats,
            fetch_servers,
            generate_config,
            store_credentials,
            get_credentials,
            clear_credentials,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
