use parking_lot::RwLock;

#[derive(Clone, Debug, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Telemetry {
    pub cpu_temp_c: f32,
    pub sys_temp_c: f32,
    pub cpu_fan_rpm: u32,
    pub gpu_fan_rpm: u32,
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
}

impl AppState {
    pub fn new() -> Self {
        Self {
            last_telemetry: RwLock::new(None),
            connection: RwLock::new(ConnectionStatus::Disconnected),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
