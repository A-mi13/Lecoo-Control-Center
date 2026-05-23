use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, async_runtime};

use crate::ipc_client::IpcClient;
use crate::state::{AppState, ConnectionStatus};
use crate::tray;

/// Default interval between telemetry samples in milliseconds. The
/// effective value lives in `AppState::poll_interval_ms` so the user can
/// tune it from Settings — every IPC call becomes an EC port-I/O
/// round-trip, and on most Lenovo / Lecoo boards those can fire SMIs.
/// Three seconds is enough for a chart someone is looking at without
/// bothering the EC pointlessly.
const RECONNECT_DELAY_MS: u64 = 2000;
/// When the window is hidden we keep the connection alive but skip
/// telemetry round-trips entirely. This is the upper bound on how long we
/// stay parked before re-checking the pause flag.
const PAUSED_CHECK_MS: u64 = 5000;

pub fn start(app: AppHandle) {
    async_runtime::spawn(async move {
        run(app).await;
    });
}

async fn run(app: AppHandle) {
    let state = app.state::<Arc<AppState>>().inner().clone();

    loop {
        set_status(&app, &state, ConnectionStatus::Connecting);

        let mut client = match IpcClient::connect() {
            Ok(c) => {
                let version = c.daemon_version;
                set_status(&app, &state, ConnectionStatus::Connected { daemon_version: version });
                c
            }
            Err(e) => {
                let msg = e.to_string();
                tracing::warn!("daemon connect failed: {msg}");
                *state.last_connection_error.write() = Some(msg.clone());
                set_status(&app, &state, ConnectionStatus::Error { message: msg });
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_millis(RECONNECT_DELAY_MS)) => {}
                    _ = state.reconnect_signal.notified() => {
                        tracing::info!("reconnect_now: poller woken up");
                    }
                }
                continue;
            }
        };

        loop {
            if state.poll_paused.load(Ordering::Relaxed) {
                // Window is hidden — sit on the connection and wait. A wake
                // signal (resume/show) will pop us out early.
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_millis(PAUSED_CHECK_MS)) => {}
                    _ = state.reconnect_signal.notified() => {}
                }
                continue;
            }

            match client.fetch_telemetry() {
                Ok(t) => {
                    *state.last_telemetry.write() = Some(t.clone());
                    let _ = app.emit("telemetry", &t);
                    tray::update_tooltip(&app, &t);
                }
                Err(e) => {
                    let msg = e.to_string();
                    tracing::warn!("poll failed, will reconnect: {msg}");
                    *state.last_connection_error.write() = Some(msg);
                    break;
                }
            }

            let interval_ms = state.poll_interval_ms.load(Ordering::Relaxed).max(500);
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_millis(interval_ms)) => {}
                _ = state.reconnect_signal.notified() => {}
            }
        }
    }
}

fn set_status(app: &AppHandle, state: &Arc<AppState>, status: ConnectionStatus) {
    *state.connection.write() = status.clone();
    let _ = app.emit("connection-status", &status);
}
