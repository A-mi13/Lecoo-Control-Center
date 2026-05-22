pub mod curve;
pub mod curve_runner;
pub mod ipc_client;
pub mod poller;
pub mod state;
pub mod tauri_cmds;

use std::sync::Arc;

pub fn run() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let app_state = Arc::new(state::AppState::new());
    let curve_runner = Arc::new(curve_runner::CurveRunner::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state.clone())
        .manage(curve_runner.clone())
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
        ])
        .setup(move |app| {
            poller::start(app.handle().clone());
            curve_runner::start(curve_runner.clone(), app_state.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
