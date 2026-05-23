use parking_lot::RwLock;
use std::sync::atomic::AtomicBool;
use tokio::sync::Notify;

#[derive(Clone, Debug, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Telemetry {
    pub cpu_temp_c: f32,
    pub sys_temp_c: f32,
    pub cpu_fan_rpm: u32,
    pub gpu_fan_rpm: u32,
    /// Battery state-of-charge in percent (0..=100).
    pub battery_percent: u8,
    /// Configured FlexiCharger limits: at battery_percent <= min the EC starts
    /// charging, and at battery_percent >= max it stops. (0, 0) means "Full
    /// capacity" (no limit).
    pub charge_limit_min: u8,
    pub charge_limit_max: u8,
    /// AC adapter plugged in, as reported by Windows' GetSystemPowerStatus.
    /// None means the GUI couldn't query the OS this tick.
    pub ac_connected: Option<bool>,
    pub timestamp_ms: u64,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected { daemon_version: (u8, u8) },
    Error { message: String },
}

pub struct AppState {
    pub last_telemetry: RwLock<Option<Telemetry>>,
    pub connection: RwLock<ConnectionStatus>,
    pub last_connection_error: RwLock<Option<String>>,
    /// Notify the poller to skip its reconnect delay (user clicked "Retry
    /// now") or to wake up immediately after a paused interval.
    pub reconnect_signal: Notify,
    /// When true, the poller stops issuing IPC requests. Set by the GUI when
    /// the main window is hidden (close-to-tray) so we stop bothering the EC
    /// for a UI nobody is looking at — each EC read is a slow port-I/O call
    /// that can trigger an SMI.
    pub poll_paused: AtomicBool,
    /// How often the poller pulls a telemetry sample, in milliseconds.
    /// Settable from the UI; the poller reads it after every tick so a
    /// change takes effect within the previous interval.
    pub poll_interval_ms: std::sync::atomic::AtomicU64,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            last_telemetry: RwLock::new(None),
            connection: RwLock::new(ConnectionStatus::Disconnected),
            last_connection_error: RwLock::new(None),
            reconnect_signal: Notify::new(),
            poll_paused: AtomicBool::new(false),
            poll_interval_ms: std::sync::atomic::AtomicU64::new(3000),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
