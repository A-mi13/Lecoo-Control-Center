pub mod curve;
pub mod curve_runner;
pub mod diagnostics;
pub mod ipc_client;
pub mod logging;
pub mod poller;
pub mod state;
pub mod tauri_cmds;
pub mod tray;

use tauri::Manager;

use std::sync::Arc;

pub fn run() {
    let log_ctl = logging::init(false);

    let app_state = Arc::new(state::AppState::new());
    let curve_runner = Arc::new(curve_runner::CurveRunner::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(app_state.clone())
        .manage(curve_runner.clone())
        .manage(log_ctl.clone())
        .invoke_handler(tauri::generate_handler![
            tauri_cmds::get_telemetry,
            tauri_cmds::get_connection_status,
            tauri_cmds::set_power_profile,
            tauri_cmds::set_fan_mode,
            tauri_cmds::set_charge_limit,
            tauri_cmds::set_keyboard_backlight,
            tauri_cmds::set_led_mode,
            tauri_cmds::restore_defaults,
            tauri_cmds::get_fan_curve,
            tauri_cmds::set_fan_curve,
            tauri_cmds::set_fan_curve_enabled,
            tauri_cmds::open_logs_dir,
            tauri_cmds::get_diagnostics_bundle,
            tauri_cmds::set_log_level,
            tauri_cmds::set_autostart,
            tauri_cmds::get_autostart,
            tauri_cmds::reconnect_now,
        ])
        .setup(move |app| {
            poller::start(app.handle().clone());
            curve_runner::start(curve_runner.clone(), app_state.clone());
            if let Err(e) = tray::install(app.handle()) {
                tracing::warn!("tray install failed: {e}");
            }
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let _ = w.hide();
                        api.prevent_close();
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
