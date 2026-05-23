pub mod diagnostics;
pub mod ipc_client;
pub mod logging;
pub mod poller;
pub mod power_status;
pub mod state;
pub mod tauri_cmds;
pub mod tray;
pub mod updates;

use tauri::Manager;

use std::sync::Arc;

pub fn run() {
    let _log_ctl = logging::init(false);

    let app_state = Arc::new(state::AppState::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(app_state.clone())
        .manage(_log_ctl.clone())
        .invoke_handler(tauri::generate_handler![
            tauri_cmds::get_telemetry,
            tauri_cmds::get_connection_status,
            tauri_cmds::set_power_profile,
            tauri_cmds::set_fan_mode,
            tauri_cmds::set_charge_limit,
            tauri_cmds::set_keyboard_backlight,
            tauri_cmds::set_led_mode,
            tauri_cmds::restore_defaults,
            tauri_cmds::open_logs_dir,
            tauri_cmds::get_diagnostics_bundle,
            tauri_cmds::set_log_level,
            tauri_cmds::set_autostart,
            tauri_cmds::get_autostart,
            tauri_cmds::reconnect_now,
            tauri_cmds::set_poll_paused,
            tauri_cmds::check_for_updates,
        ])
        .setup(move |app| {
            poller::start(app.handle().clone());
            if let Err(e) = tray::install(app.handle()) {
                tracing::warn!("tray install failed: {e}");
            }
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                let st = app_state.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let _ = w.hide();
                        api.prevent_close();
                        // Window is gone — stop pestering the EC until the
                        // user brings it back via the tray icon.
                        st.poll_paused
                            .store(true, std::sync::atomic::Ordering::Relaxed);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
