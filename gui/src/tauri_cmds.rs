use std::sync::Arc;

use ipc::{
    BreathBrightness, BreathConfig, BreathDelay, BreathStep, ChargeLimit, DaemonCommand, FanIndex,
    FanMode, IpcRequest, IpcResponse, KeyboardBacklightLevel, PowerLedMode, PowerProfile,
};
use serde::Deserialize;
use tauri::State;

use crate::curve::FanCurve;
use crate::curve_runner::{CurveRunner, FanCurveState};
use tauri_plugin_autostart::ManagerExt;

use crate::diagnostics;
use crate::ipc_client::IpcClient;
use crate::logging::LogControl;
use crate::state::{AppState, ConnectionStatus, Telemetry};

#[tauri::command]
pub fn get_telemetry(state: State<'_, Arc<AppState>>) -> Option<Telemetry> {
    state.last_telemetry.read().clone()
}

#[tauri::command]
pub fn get_connection_status(state: State<'_, Arc<AppState>>) -> ConnectionStatus {
    state.connection.read().clone()
}

// ---------- Setters ----------
//
// Each setter opens a fresh IpcClient connection, sends one request, and expects
// IpcResponse::Success. Errors come back as plain strings (Tauri turns Err into a
// rejected promise on the JS side).

pub fn apply_power_profile(profile: PowerProfile) -> Result<(), String> {
    send_one(IpcRequest::SetPowerProfile(profile))
}

pub fn apply_fan_mode(fan: FanIndex, mode: FanMode) -> Result<(), String> {
    send_one(IpcRequest::SetFanMode { fan, mode })
}

fn send_one(req: IpcRequest) -> Result<(), String> {
    let mut client = IpcClient::connect().map_err(|e| e.to_string())?;
    let resp: IpcResponse = client.request(&req).map_err(|e| e.to_string())?;
    match resp {
        IpcResponse::Success => Ok(()),
        IpcResponse::Error(msg) => Err(msg),
        other => Err(format!("unexpected response: {other:?}")),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum PowerProfileArg {
    Silent,
    Default,
    Performance,
}

impl From<PowerProfileArg> for PowerProfile {
    fn from(p: PowerProfileArg) -> Self {
        match p {
            PowerProfileArg::Silent => PowerProfile::Silent,
            PowerProfileArg::Default => PowerProfile::Default,
            PowerProfileArg::Performance => PowerProfile::Performance,
        }
    }
}

#[tauri::command]
pub fn set_power_profile(profile: PowerProfileArg) -> Result<(), String> {
    send_one(IpcRequest::SetPowerProfile(profile.into()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum FanArg {
    Cpu,
    Gpu,
}

impl From<FanArg> for FanIndex {
    fn from(f: FanArg) -> Self {
        match f {
            FanArg::Cpu => FanIndex::Cpu,
            FanArg::Gpu => FanIndex::Gpu,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FanModeArg {
    Auto,
    Full,
    Custom { pwm: u8 },
}

impl From<FanModeArg> for FanMode {
    fn from(m: FanModeArg) -> Self {
        match m {
            FanModeArg::Auto => FanMode::Auto,
            FanModeArg::Full => FanMode::Full,
            FanModeArg::Custom { pwm } => FanMode::Custom(pwm),
        }
    }
}

#[tauri::command]
pub fn set_fan_mode(fan: FanArg, mode: FanModeArg) -> Result<(), String> {
    send_one(IpcRequest::SetFanMode {
        fan: fan.into(),
        mode: mode.into(),
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum ChargeLimitArg {
    FullCapacity,
    HighCapacity,
    Balanced,
    MaximumLifespan,
    DeskMode,
}

impl From<ChargeLimitArg> for ChargeLimit {
    fn from(c: ChargeLimitArg) -> Self {
        match c {
            ChargeLimitArg::FullCapacity => ChargeLimit::FullCapacity,
            ChargeLimitArg::HighCapacity => ChargeLimit::HighCapacity,
            ChargeLimitArg::Balanced => ChargeLimit::Balanced,
            ChargeLimitArg::MaximumLifespan => ChargeLimit::MaximumLifespan,
            ChargeLimitArg::DeskMode => ChargeLimit::DeskMode,
        }
    }
}

#[tauri::command]
pub fn set_charge_limit(limit: ChargeLimitArg) -> Result<(), String> {
    send_one(IpcRequest::SetChargeLimit(limit.into()))
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum KeyboardBacklightArg {
    Off,
    Low,
    Medium,
    High,
    Custom { value: u8 },
}

impl From<KeyboardBacklightArg> for KeyboardBacklightLevel {
    fn from(k: KeyboardBacklightArg) -> Self {
        match k {
            KeyboardBacklightArg::Off => KeyboardBacklightLevel::Off,
            KeyboardBacklightArg::Low => KeyboardBacklightLevel::Low,
            KeyboardBacklightArg::Medium => KeyboardBacklightLevel::Medium,
            KeyboardBacklightArg::High => KeyboardBacklightLevel::High,
            KeyboardBacklightArg::Custom { value } => KeyboardBacklightLevel::Custom(value),
        }
    }
}

#[tauri::command]
pub fn set_keyboard_backlight(level: KeyboardBacklightArg) -> Result<(), String> {
    send_one(IpcRequest::SetKeyboardBacklight(level.into()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum BreathBrightnessArg {
    Max25Percent,
    Max50Percent,
    Max75Percent,
    Max100Percent,
}

impl From<BreathBrightnessArg> for BreathBrightness {
    fn from(b: BreathBrightnessArg) -> Self {
        match b {
            BreathBrightnessArg::Max25Percent => BreathBrightness::Max25Percent,
            BreathBrightnessArg::Max50Percent => BreathBrightness::Max50Percent,
            BreathBrightnessArg::Max75Percent => BreathBrightness::Max75Percent,
            BreathBrightnessArg::Max100Percent => BreathBrightness::Max100Percent,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum BreathStepArg {
    Slow,
    Medium,
    Fast,
    Instant,
}

impl From<BreathStepArg> for BreathStep {
    fn from(s: BreathStepArg) -> Self {
        match s {
            BreathStepArg::Slow => BreathStep::Slow,
            BreathStepArg::Medium => BreathStep::Medium,
            BreathStepArg::Fast => BreathStep::Fast,
            BreathStepArg::Instant => BreathStep::Instant,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum BreathDelayArg {
    Ms15,
    Ms125,
    Ms250,
    Sec0_5,
    Sec1,
    Sec2,
    Sec4,
}

impl From<BreathDelayArg> for BreathDelay {
    fn from(d: BreathDelayArg) -> Self {
        match d {
            BreathDelayArg::Ms15 => BreathDelay::Ms15,
            BreathDelayArg::Ms125 => BreathDelay::Ms125,
            BreathDelayArg::Ms250 => BreathDelay::Ms250,
            BreathDelayArg::Sec0_5 => BreathDelay::Sec0_5,
            BreathDelayArg::Sec1 => BreathDelay::Sec1,
            BreathDelayArg::Sec2 => BreathDelay::Sec2,
            BreathDelayArg::Sec4 => BreathDelay::Sec4,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BreathConfigArg {
    pub max_brightness: BreathBrightnessArg,
    pub step_up: BreathStepArg,
    pub step_down: BreathStepArg,
    pub delay_at_max: BreathDelayArg,
    pub delay_at_min: BreathDelayArg,
}

impl From<BreathConfigArg> for BreathConfig {
    fn from(b: BreathConfigArg) -> Self {
        BreathConfig {
            max_brightness: b.max_brightness.into(),
            step_up: b.step_up.into(),
            step_down: b.step_down.into(),
            delay_at_max: b.delay_at_max.into(),
            delay_at_min: b.delay_at_min.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PowerLedModeArg {
    Auto,
    Custom { value: u8 },
    Animation { config: BreathConfigArg },
}

impl From<PowerLedModeArg> for PowerLedMode {
    fn from(m: PowerLedModeArg) -> Self {
        match m {
            PowerLedModeArg::Auto => PowerLedMode::Auto,
            PowerLedModeArg::Custom { value } => PowerLedMode::Custom(value),
            PowerLedModeArg::Animation { config } => PowerLedMode::Animation(config.into()),
        }
    }
}

#[tauri::command]
pub fn set_led_mode(mode: PowerLedModeArg) -> Result<(), String> {
    send_one(IpcRequest::SetLedMode(mode.into()))
}

#[tauri::command]
pub fn restore_defaults() -> Result<(), String> {
    send_one(IpcRequest::DaemonCommand(DaemonCommand::RestoreDefaults))
}

// ---------- Fan curve ----------

#[tauri::command]
pub fn get_fan_curve(fan: FanArg, runner: State<'_, Arc<CurveRunner>>) -> FanCurveState {
    match fan {
        FanArg::Cpu => runner.cpu.read().clone(),
        FanArg::Gpu => runner.gpu.read().clone(),
    }
}

#[tauri::command]
pub fn set_fan_curve(
    fan: FanArg,
    curve: FanCurve,
    runner: State<'_, Arc<CurveRunner>>,
) -> Result<(), String> {
    let slot = match fan {
        FanArg::Cpu => &runner.cpu,
        FanArg::Gpu => &runner.gpu,
    };
    let mut st = slot.write();
    st.curve = Some(curve);
    Ok(())
}

#[tauri::command]
pub fn reconnect_now(state: State<'_, Arc<AppState>>) {
    state.reconnect_signal.notify_one();
}

// ---------- Autostart ----------

#[tauri::command]
pub async fn set_autostart(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enable {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    let manager = app.autolaunch();
    manager.is_enabled().map_err(|e| e.to_string())
}

// ---------- Diagnostics ----------

#[tauri::command]
pub fn open_logs_dir(log_ctl: State<'_, Arc<LogControl>>) -> Result<(), String> {
    let path = log_ctl.log_dir().to_path_buf();
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    open_in_explorer(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_diagnostics_bundle(
    state: State<'_, Arc<AppState>>,
    log_ctl: State<'_, Arc<LogControl>>,
) -> String {
    diagnostics::collect(state.inner(), log_ctl.inner())
}

#[tauri::command]
pub fn set_log_level(level: String, log_ctl: State<'_, Arc<LogControl>>) -> Result<(), String> {
    log_ctl.set_level(&level)
}

#[cfg(target_os = "windows")]
fn open_in_explorer(path: &std::path::Path) -> std::io::Result<()> {
    std::process::Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
}

#[cfg(target_os = "macos")]
fn open_in_explorer(path: &std::path::Path) -> std::io::Result<()> {
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map(|_| ())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_in_explorer(path: &std::path::Path) -> std::io::Result<()> {
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map(|_| ())
}

#[tauri::command]
pub fn set_fan_curve_enabled(
    fan: FanArg,
    enabled: bool,
    runner: State<'_, Arc<CurveRunner>>,
) -> Result<(), String> {
    let slot = match fan {
        FanArg::Cpu => &runner.cpu,
        FanArg::Gpu => &runner.gpu,
    };
    {
        let mut st = slot.write();
        st.enabled = enabled;
    }
    // When the user turns the curve off, hand control back to EC's auto policy.
    if !enabled {
        let _ = send_one(IpcRequest::SetFanMode {
            fan: match fan {
                FanArg::Cpu => FanIndex::Cpu,
                FanArg::Gpu => FanIndex::Gpu,
            },
            mode: FanMode::Auto,
        });
    }
    Ok(())
}
