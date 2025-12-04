# SACVPN Desktop Client

Premium native VPN client for Windows and macOS, powered by WireGuard protocol.

![SACVPN Desktop](https://sacvpn.com/og-image.png)

## Features

- **One-Click Connect** - Simple, fast connection to any server
- **WireGuard Protocol** - Fastest and most secure VPN protocol
- **Kill Switch** - Protects your data if VPN connection drops
- **Server Selection** - Choose from 10+ global locations
- **Auto-Connect** - Connect automatically on startup or untrusted networks
- **Split Tunneling** - Choose which apps use VPN
- **System Tray** - Runs quietly in the background
- **Beautiful UI** - Modern dark theme with smooth animations

## Requirements

### Development
- Node.js 18+
- Rust 1.70+ (install via [rustup](https://rustup.rs))
- Tauri CLI (`cargo install tauri-cli`)

### Windows
- Windows 10/11
- Visual Studio Build Tools with C++ workload
- [WireGuard for Windows](https://www.wireguard.com/install/) (optional, for native performance)

### macOS
- macOS 10.15+
- Xcode Command Line Tools
- [WireGuard for macOS](https://apps.apple.com/us/app/wireguard/id1451685025) (optional)

## Installation

### 1. Install Rust

```bash
# Windows (PowerShell)
winget install Rustlang.Rustup

# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/kstephens0331/sacvpn-desktop.git
cd sacvpn-desktop

# Install Node.js dependencies
npm install

# Install Tauri CLI
cargo install tauri-cli
```

### 3. Development

```bash
# Run in development mode
npm run tauri:dev

# Or use cargo directly
cargo tauri dev
```

### 4. Build for Production

```bash
# Build optimized release
npm run tauri:build

# Output will be in:
# - Windows: src-tauri/target/release/bundle/msi/
# - macOS: src-tauri/target/release/bundle/dmg/
```

## Project Structure

```
sacvpn-desktop/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── stores/             # Zustand state management
│   ├── App.tsx             # Main application
│   └── main.tsx            # Entry point
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry point
│   │   └── vpn/            # VPN management
│   │       ├── mod.rs      # VPN manager
│   │       └── wireguard.rs # WireGuard integration
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Node.js dependencies
└── README.md
```

## Architecture

### Frontend (React + TypeScript)
- **Zustand** for state management
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend (Rust + Tauri)
- **Tauri 2.0** for native app framework
- **WireGuard** for VPN protocol
- **Keyring** for secure credential storage
- **Tokio** for async runtime

### VPN Connection Flow
1. User authenticates with SACVPN API
2. App fetches server list
3. User selects server
4. App generates WireGuard config via API
5. Rust backend establishes WireGuard tunnel
6. Traffic routes through VPN

## API Integration

The desktop client connects to the SACVPN API:

```
GET  /api/vpn/servers     # List available servers
POST /api/vpn/config      # Generate WireGuard config
GET  /api/billing/manage  # Manage subscription
```

## Code Signing

### Windows
- Requires EV Code Signing Certificate
- Update `certificateThumbprint` in `tauri.conf.json`

### macOS
- Requires Apple Developer ID
- App must be notarized for distribution
- Update `signingIdentity` in `tauri.conf.json`

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Email: info@stephenscode.dev
- Website: https://sacvpn.com
- Documentation: https://sacvpn.com/faq

---

Built with love by [Stephen's Code](https://stephenscode.dev)
