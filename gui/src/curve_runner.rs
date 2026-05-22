use std::sync::Arc;
use std::time::Duration;

use ipc::{FanIndex, FanMode, IpcRequest, IpcResponse};
use parking_lot::RwLock;

use crate::curve::FanCurve;
use crate::ipc_client::IpcClient;
use crate::state::AppState;

/// EC duty cycle is rejected by daemon above 220 (see daemon/src/ec/hw/fan.rs).
const MAX_DUTY: u8 = 220;

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FanCurveState {
    pub curve: Option<FanCurve>,
    pub enabled: bool,
}

pub struct CurveRunner {
    pub cpu: RwLock<FanCurveState>,
    pub gpu: RwLock<FanCurveState>,
}

impl CurveRunner {
    pub fn new() -> Self {
        Self {
            cpu: RwLock::new(FanCurveState::default()),
            gpu: RwLock::new(FanCurveState::default()),
        }
    }
}

impl Default for CurveRunner {
    fn default() -> Self {
        Self::new()
    }
}

/// Map a percentage in 0..=100 to EC duty in 0..=MAX_DUTY.
fn pct_to_duty(pct: u8) -> u8 {
    let p = pct.min(100) as u16;
    let d = (p * MAX_DUTY as u16) / 100;
    d as u8
}

pub fn start(runner: Arc<CurveRunner>, app_state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        run(runner, app_state).await;
    });
}

async fn run(runner: Arc<CurveRunner>, app_state: Arc<AppState>) {
    loop {
        tokio::time::sleep(Duration::from_millis(500)).await;

        let telem = match app_state.last_telemetry.read().clone() {
            Some(t) => t,
            None => continue,
        };

        let mut to_apply: Vec<(FanIndex, u8)> = Vec::with_capacity(2);

        if let Some(duty) = read_duty(&runner.cpu, telem.cpu_temp_c) {
            to_apply.push((FanIndex::Cpu, duty));
        }
        if let Some(duty) = read_duty(&runner.gpu, telem.sys_temp_c) {
            to_apply.push((FanIndex::Gpu, duty));
        }

        if to_apply.is_empty() {
            continue;
        }

        // One connection per tick is wasteful but simple. Switch to a long-lived
        // connection if profiling ever shows it as a hotspot.
        let mut client = match IpcClient::connect() {
            Ok(c) => c,
            Err(_) => continue,
        };

        for (fan, duty) in to_apply {
            let req = IpcRequest::SetFanMode {
                fan,
                mode: FanMode::Custom(duty),
            };
            if let Ok(resp) = client.request::<_, IpcResponse>(&req) {
                if let IpcResponse::Error(msg) = resp {
                    tracing::warn!("curve runner: daemon rejected {fan:?} duty {duty}: {msg}");
                }
            }
        }
    }
}

fn read_duty(state: &RwLock<FanCurveState>, temp_c: f32) -> Option<u8> {
    let st = state.read();
    if !st.enabled {
        return None;
    }
    let curve = st.curve.as_ref()?;
    Some(pct_to_duty(curve.pwm_at(temp_c)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pct_to_duty_bounds() {
        assert_eq!(pct_to_duty(0), 0);
        assert_eq!(pct_to_duty(50), 110);
        assert_eq!(pct_to_duty(100), 220);
        assert_eq!(pct_to_duty(255), 220);
    }
}
