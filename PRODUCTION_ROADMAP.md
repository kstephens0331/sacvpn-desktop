# SACVPN Desktop - Production Roadmap

> Branded WireGuard client that integrates with SACVPN.com backend for one-push VPN activation.

**Backend:** `https://scvpn-production.up.railway.app`
**Auth:** Supabase (same as SACVPN.com)
**Data:** Supabase PostgreSQL

---

## Phase 1: Critical Fixes

Fix blocking issues preventing the app from running.

### 1.1 Runtime Crash Fixes
- [ ] Fix AccountPanel store reference - change `useVPNStore()` to `useAuthStore()`
- [ ] Fix missing `setAuth` function usage
- [ ] Audit all components for incorrect store references

### 1.2 Remove Demo/Mock Code
- [ ] Remove hardcoded mock servers from `vpnStore.ts`
- [ ] Remove demo login bypass
- [ ] Remove simulated connection timeouts
- [ ] Remove console.log debug statements

### 1.3 Environment Configuration
- [ ] Create `.env.example` with required variables
- [ ] Move Supabase URL/key to environment variables
- [ ] Move Railway API URL to environment variables
- [ ] Configure Vite to handle env vars properly

---

## Phase 2: Backend Integration

Connect to existing SACVPN.com infrastructure.

### 2.1 Supabase Authentication
- [ ] Configure Supabase client with correct credentials
- [ ] Implement `signInWithPassword()` login flow
- [ ] Implement session persistence (remember me)
- [ ] Implement token refresh handling
- [ ] Implement logout with session cleanup
- [ ] Query `profiles` table for user info
- [ ] Query `subscriptions` table for plan status

### 2.2 Device Registration
- [ ] Generate real hardware ID (machine fingerprint)
- [ ] Check if device already exists in `devices` table
- [ ] Register new device: INSERT into `devices` table with platform detection
- [ ] Store device ID securely in OS keychain
- [ ] Handle device limit errors (based on subscription)

### 2.3 WireGuard Config Retrieval
- [ ] Call `POST /api/wireguard/generate-key` with device_id
- [ ] Call `GET /api/device/{id}/config-data` to fetch config
- [ ] Parse config response (configText, clientIp, nodeName, nodeRegion)
- [ ] Handle key generation errors gracefully
- [ ] Cache config locally (encrypted) for offline access

### 2.4 Server List
- [ ] Query `vps_hosts` table for available servers
- [ ] Query `vps_metrics` table for server load/status
- [ ] Display servers with location, load indicator
- [ ] Implement server selection (user choice or auto-best)
- [ ] Store last-used server preference

---

## Phase 3: WireGuard Tunnel Management

The core VPN functionality - one-push activation.

### 3.1 Windows Implementation
- [ ] Bundle WireGuard binaries (`wireguard.exe`, `wg.exe`)
- [ ] Write config to secure temp location
- [ ] Install WireGuard tunnel service via CLI
- [ ] Activate tunnel: `wireguard.exe /installtunnelservice <config>`
- [ ] Handle UAC elevation for service installation
- [ ] Monitor tunnel status via service state
- [ ] Deactivate tunnel: `wireguard.exe /uninstalltunnelservice <name>`
- [ ] Clean up config file after disconnect

### 3.2 macOS Implementation
- [ ] Implement via `wg-quick` or Network Extension
- [ ] Handle System Preferences security approval
- [ ] Write config to appropriate location
- [ ] Activate tunnel via `wg-quick up`
- [ ] Monitor tunnel status
- [ ] Deactivate tunnel via `wg-quick down`

### 3.3 Connection State Management
- [ ] Implement proper state machine (disconnected → connecting → connected → disconnecting)
- [ ] Track connection duration
- [ ] Collect transfer statistics from WireGuard interface
- [ ] Handle connection failures with user feedback
- [ ] Implement auto-reconnect on network change

### 3.4 One-Push Activation Flow
- [ ] Single "Connect" button triggers full flow
- [ ] Auto-register device if needed
- [ ] Auto-generate key if needed
- [ ] Auto-fetch config
- [ ] Auto-apply and connect
- [ ] Show progress indicator during setup
- [ ] Handle all errors with clear user messages

---

## Phase 4: Security & Credentials

Secure storage and handling of sensitive data.

### 4.1 Credential Storage
- [ ] Store auth tokens in OS keychain (not localStorage)
- [ ] Store device ID in OS keychain
- [ ] Encrypt cached WireGuard config
- [ ] Clear sensitive data on logout
- [ ] Implement secure IPC between frontend and Rust

### 4.2 Input Validation
- [ ] Validate email format on login
- [ ] Sanitize all user inputs
- [ ] Validate DNS server inputs (if custom DNS feature kept)

### 4.3 Network Security
- [ ] Verify API responses are from legitimate backend
- [ ] Handle certificate errors appropriately
- [ ] Implement request timeouts

---

## Phase 5: User Interface

Polish the UI for production quality.

### 5.1 Login Screen
- [ ] Create dedicated login view
- [ ] Add email/password form with validation
- [ ] Show loading state during authentication
- [ ] Display error messages clearly
- [ ] Add "Forgot Password" link (opens web)
- [ ] Add "Create Account" link (opens web)

### 5.2 Connection Screen
- [ ] Large connect/disconnect button
- [ ] Current server display
- [ ] Connection status (connected/disconnected/connecting)
- [ ] Connection duration timer
- [ ] Upload/download speed display
- [ ] IP address display (connected IP)

### 5.3 Server Selection
- [ ] Server list with locations
- [ ] Server load indicators (from vps_metrics)
- [ ] Search/filter servers
- [ ] Quick-connect to last used
- [ ] Favorite servers (if keeping feature)

### 5.4 Account Panel
- [ ] Display user email
- [ ] Display subscription plan
- [ ] Display subscription expiry
- [ ] "Manage Subscription" button (opens web billing portal)
- [ ] Logout button

### 5.5 Settings
- [ ] Launch on startup toggle
- [ ] Auto-connect on launch toggle
- [ ] Minimize to tray toggle
- [ ] About/version info

---

## Phase 6: System Integration

OS-level features for a native experience.

### 6.1 System Tray
- [ ] Show tray icon with connection status
- [ ] Right-click menu: Connect/Disconnect
- [ ] Right-click menu: Exit
- [ ] Double-click to open main window
- [ ] Connection status tooltip

### 6.2 Startup Behavior
- [ ] Option to launch on system startup
- [ ] Start minimized to tray option
- [ ] Auto-connect on launch option

### 6.3 Notifications
- [ ] Notify on connect success
- [ ] Notify on disconnect
- [ ] Notify on connection error

---

## Phase 7: Error Handling

Robust error handling for production reliability.

### 7.1 Error Display
- [ ] Create toast notification system
- [ ] User-friendly error messages (not technical)
- [ ] Provide actionable guidance in errors

### 7.2 Specific Error Handling
- [ ] Network offline detection
- [ ] Invalid credentials handling
- [ ] Expired subscription handling
- [ ] Device limit reached handling
- [ ] Server unreachable handling
- [ ] WireGuard installation failure handling

### 7.3 Logging
- [ ] Implement structured logging
- [ ] Log to file with rotation
- [ ] Add "Export Logs" for support

---

## Phase 8: Build & Distribution

Production build pipeline.

### 8.1 Code Signing - Windows
- [ ] Obtain EV code signing certificate
- [ ] Configure certificate thumbprint in tauri.conf.json
- [ ] Test signed build passes SmartScreen

### 8.2 Code Signing - macOS
- [ ] Obtain Apple Developer ID certificate
- [ ] Configure notarization
- [ ] Test notarized build passes Gatekeeper

### 8.3 Auto-Updater
- [ ] Generate Ed25519 signing keypair
- [ ] Configure pubkey in tauri.conf.json
- [ ] Set up update manifest hosting
- [ ] Implement update check on launch
- [ ] Show update available notification

### 8.4 Installers
- [ ] Windows: MSI or NSIS installer
- [ ] macOS: DMG with drag-to-Applications
- [ ] Include WireGuard binaries in installer

### 8.5 CI/CD
- [ ] GitHub Actions build pipeline
- [ ] Build matrix: Windows x64, macOS x64/ARM
- [ ] Automated testing stage
- [ ] Artifact publishing
- [ ] Release automation

---

## Phase 9: Testing

Ensure reliability before launch.

### 9.1 Unit Tests
- [ ] Test auth store logic
- [ ] Test VPN store logic
- [ ] Test API service functions
- [ ] Test config parsing

### 9.2 Integration Tests
- [ ] Test login flow end-to-end
- [ ] Test device registration flow
- [ ] Test config retrieval flow
- [ ] Test connect/disconnect cycle

### 9.3 Manual Testing
- [ ] Test on Windows 10
- [ ] Test on Windows 11
- [ ] Test on macOS Intel
- [ ] Test on macOS Apple Silicon
- [ ] Test fresh install experience
- [ ] Test upgrade from previous version

---

## Phase 10: Pre-Launch

Final checks before release.

### 10.1 Security Review
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `cargo audit` and fix vulnerabilities
- [ ] Verify no secrets in code
- [ ] Verify no debug code in production

### 10.2 Performance
- [ ] Profile startup time
- [ ] Optimize bundle size
- [ ] Test memory usage over time

### 10.3 Documentation
- [ ] Update website with desktop app info
- [ ] Create installation guide
- [ ] Create troubleshooting FAQ

### 10.4 Launch
- [ ] Beta test with select users
- [ ] Gather feedback and fix issues
- [ ] Create download page on SACVPN.com
- [ ] Announce availability

---

## Summary

| Phase | Tasks | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| 1. Critical Fixes | 10 | 🔴 Blocker | 1 day |
| 2. Backend Integration | 17 | 🔴 Critical | 3-4 days |
| 3. WireGuard Tunnel | 18 | 🔴 Critical | 1 week |
| 4. Security | 10 | 🟠 High | 2 days |
| 5. User Interface | 20 | 🟠 High | 3-4 days |
| 6. System Integration | 10 | 🟡 Medium | 2 days |
| 7. Error Handling | 12 | 🟡 Medium | 2 days |
| 8. Build & Distribution | 14 | 🟠 High | 3-4 days |
| 9. Testing | 12 | 🟡 Medium | 2-3 days |
| 10. Pre-Launch | 10 | 🟡 Medium | 2-3 days |

**Total: ~133 tasks**

---

## Execution Order

```
Phase 1 (Critical Fixes)
       ↓
Phase 2 (Backend Integration)
       ↓
Phase 3.1-3.2 (WireGuard for your platform first)
       ↓
Phase 3.3-3.4 (Connection management)
       ↓
Phase 4 (Security) ←──────────────┐
       ↓                          │ Parallel
Phase 5 (UI Polish)               │
       ↓                          │
Phase 6 (System Integration) ─────┘
       ↓
Phase 7 (Error Handling)
       ↓
Phase 8 (Build & Distribution)
       ↓
Phase 9 (Testing)
       ↓
Phase 10 (Pre-Launch)
       ↓
    🚀 LAUNCH
```

---

## Key API Reference

### Authentication
```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password"
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Get profile
const { data: profile } = await supabase.from("profiles")
  .select("id, email, full_name, account_type")
  .eq("id", user.id)
  .single();

// Get subscription
const { data: subscription } = await supabase.from("subscriptions")
  .select("*")
  .eq("user_id", user.id)
  .eq("status", "active")
  .single();
```

### Device Management
```javascript
// Check existing device
const { data: devices } = await supabase.from("devices")
  .select("*")
  .eq("user_id", user.id)
  .eq("platform", "windows"); // or "macos"

// Register device
const { data: device } = await supabase.from("devices")
  .insert({
    user_id: user.id,
    name: "My Desktop",
    platform: "windows",
    is_active: true
  })
  .select()
  .single();
```

### WireGuard Config
```javascript
// Generate key
const response = await fetch(`${API_BASE}/api/wireguard/generate-key`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`
  },
  body: JSON.stringify({ device_id: deviceId })
});

// Get config
const configResponse = await fetch(
  `${API_BASE}/api/device/${deviceId}/config-data`
);
const { configText, qrCode, clientIp, nodeName } = await configResponse.json();
```

### Server List
```javascript
// Get servers
const { data: servers } = await supabase.from("vps_hosts")
  .select("id, name, ip");

// Get server metrics
const { data: metrics } = await supabase.from("vps_metrics")
  .select("host_id, cpu, mem_used, mem_total, load1")
  .order("ts", { ascending: false });
```

---

*Last Updated: December 5, 2025*
