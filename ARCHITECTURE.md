# SACVPN Desktop Client Architecture

## Overview
Premium native VPN client for Windows and macOS that rivals NordVPN, ExpressVPN, and Mullvad.
Uses WireGuard protocol under the hood with full SACVPN branding.

## Technology Stack

### Core Framework: Tauri 2.0 + Rust
- **Why Tauri over Electron:**
  - 10MB app size vs 150MB+ for Electron
  - 50% less memory usage
  - Native performance
  - Rust backend for security-critical VPN operations
  - Built-in auto-updater
  - Code signing support

### Frontend: React + TypeScript + Tailwind CSS
- Matches existing SACVPN web stack
- Shared design system
- Framer Motion animations

### VPN Core: WireGuard
- **Windows:** WireGuard-NT (kernel driver) or wireguard-go
- **macOS:** NetworkExtension framework with WireGuard

## Features (Premium Quality)

### Core VPN Features
- [ ] One-click connect/disconnect
- [ ] Server selection with search and favorites
- [ ] Auto-connect on startup
- [ ] Auto-connect on untrusted networks
- [ ] Kill switch (block internet if VPN drops)
- [ ] Split tunneling (exclude apps/IPs)
- [ ] Multi-hop connections
- [ ] Custom DNS servers
- [ ] IPv6 leak protection
- [ ] WebRTC leak protection

### User Experience
- [ ] Beautiful dark/light theme UI
- [ ] Real-time connection statistics
- [ ] Speed test integration
- [ ] Server load indicators
- [ ] Latency/ping display
- [ ] Connection history
- [ ] Bandwidth usage graphs
- [ ] System tray/menu bar integration
- [ ] Notifications
- [ ] Keyboard shortcuts

### Security
- [ ] Secure credential storage (OS keychain)
- [ ] Certificate pinning
- [ ] Automatic key rotation
- [ ] Memory protection (secure string handling)
- [ ] Anti-tamper protection

### Enterprise Features
- [ ] MDM/GPO support
- [ ] Silent installation
- [ ] Pre-configured deployments
- [ ] Centralized management API

## Project Structure

```
sacvpn-desktop/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # App entry point
│   │   ├── vpn/
│   │   │   ├── mod.rs
│   │   │   ├── wireguard.rs  # WireGuard integration
│   │   │   ├── config.rs     # Config management
│   │   │   └── tunnel.rs     # Tunnel management
│   │   ├── api/
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs       # Authentication
│   │   │   └── servers.rs    # Server API
│   │   ├── system/
│   │   │   ├── mod.rs
│   │   │   ├── tray.rs       # System tray
│   │   │   ├── autostart.rs  # Auto-launch
│   │   │   └── killswitch.rs # Kill switch
│   │   └── commands.rs       # Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React frontend
│   ├── components/
│   │   ├── ConnectionButton.tsx
│   │   ├── ServerList.tsx
│   │   ├── StatusBar.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Servers.tsx
│   │   ├── Settings.tsx
│   │   └── Account.tsx
│   ├── hooks/
│   │   ├── useVPN.ts
│   │   ├── useServers.ts
│   │   └── useSettings.ts
│   ├── stores/
│   │   └── vpnStore.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── tauri.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── assets/
├── package.json
└── README.md
```

## API Integration

### Authentication Flow
1. User logs in via SACVPN web or desktop app
2. App receives JWT token
3. Token stored securely in OS keychain
4. Token used for API calls and config generation

### Server List API
```
GET /api/vpn/servers
Response: {
  servers: [
    {
      id: "us-east-1",
      name: "New York",
      country: "US",
      city: "New York",
      ip: "xxx.xxx.xxx.xxx",
      publicKey: "...",
      load: 45,
      latency: 23
    }
  ]
}
```

### Config Generation API
```
POST /api/vpn/config
Body: { serverId: "us-east-1" }
Response: {
  config: "[Interface]\nPrivateKey=...\n..."
}
```

## Platform-Specific Implementation

### Windows
- WireGuard-NT kernel driver for best performance
- Windows Filtering Platform (WFP) for kill switch
- Registry for auto-start
- Windows Credential Manager for secrets
- MSI installer with driver installation

### macOS
- NetworkExtension framework (requires Apple Developer account)
- System Extension for VPN
- Keychain for secrets
- LaunchAgent for auto-start
- DMG installer with notarization

## Build & Distribution

### Code Signing
- Windows: EV Code Signing Certificate (required for driver)
- macOS: Apple Developer ID + Notarization

### Auto-Update
- Tauri's built-in updater
- Signed update manifests
- Delta updates for faster downloads

### Installers
- Windows: MSI via WiX Toolset
- macOS: DMG with drag-to-Applications

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Tauri project
- [ ] Basic UI shell
- [ ] Authentication flow
- [ ] Server list display

### Phase 2: Core VPN (Week 3-4)
- [ ] WireGuard integration
- [ ] Connect/disconnect
- [ ] Config generation
- [ ] Basic kill switch

### Phase 3: Polish (Week 5-6)
- [ ] Full UI implementation
- [ ] System tray
- [ ] Auto-connect
- [ ] Settings persistence

### Phase 4: Advanced (Week 7-8)
- [ ] Split tunneling
- [ ] Multi-hop
- [ ] Statistics/graphs
- [ ] Auto-updater

### Phase 5: Distribution (Week 9-10)
- [ ] Code signing
- [ ] Installer creation
- [ ] Website download page
- [ ] Beta testing

## Security Considerations

1. **No logging of traffic** - Only connection timestamps for debugging
2. **Secure key storage** - Use OS keychain, never plaintext
3. **Memory safety** - Rust prevents buffer overflows
4. **Certificate pinning** - Prevent MITM attacks
5. **Kill switch** - Firewall rules, not just route changes
