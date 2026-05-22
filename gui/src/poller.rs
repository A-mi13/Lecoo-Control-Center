use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, async_runtime};

use crate::ipc_client::IpcClient;
use crate::state::{AppState, ConnectionStatus};

const POLL_INTERVAL_MS: u64 = 1000;
const RECONNECT_DELAY_MS: u64 = 2000;

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
            match client.fetch_telemetry() {
                Ok(t) => {
                    *state.last_telemetry.write() = Some(t.clone());
                    let _ = app.emit("telemetry", &t);
                }
                Err(e) => {
                    let msg = e.to_string();
                    tracing::warn!("poll failed, will reconnect: {msg}");
                    *state.last_connection_error.write() = Some(msg);
                    break;
                }
            }
            tokio::time::sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;
        }
    }
}

fn set_status(app: &AppHandle, state: &Arc<AppState>, status: ConnectionStatus) {
    *state.connection.write() = status.clone();
    let _ = app.emit("connection-status", &status);
}
