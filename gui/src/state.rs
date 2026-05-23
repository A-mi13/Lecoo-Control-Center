use parking_lot::RwLock;
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
    /// Notify the poller to skip its reconnect delay (user clicked "Retry now").
    pub reconnect_signal: Notify,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            last_telemetry: RwLock::new(None),
            connection: RwLock::new(ConnectionStatus::Disconnected),
            last_connection_error: RwLock::new(None),
            reconnect_signal: Notify::new(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
