use ipc::{FanIndex, FanMode, PowerProfile};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::tauri_cmds;

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Open window", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let prof_silent = MenuItem::with_id(app, "profile_silent", "Silent", true, None::<&str>)?;
    let prof_default = MenuItem::with_id(app, "profile_default", "Default", true, None::<&str>)?;
    let prof_perf = MenuItem::with_id(app, "profile_perf", "Performance", true, None::<&str>)?;
    let profile_menu = Submenu::with_items(
        app,
        "Power profile",
        true,
        &[&prof_silent, &prof_default, &prof_perf],
    )?;

    let fan_auto = MenuItem::with_id(app, "fan_auto", "Auto", true, None::<&str>)?;
    let fan_full = MenuItem::with_id(app, "fan_full", "Full", true, None::<&str>)?;
    let fan_menu = Submenu::with_items(app, "Fans (CPU)", true, &[&fan_auto, &fan_full])?;

    let menu = Menu::with_items(
        app,
        &[&show, &sep1, &profile_menu, &fan_menu, &sep2, &quit],
    )?;

    TrayIconBuilder::new()
        .tooltip("Lecoo Control Center")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => bring_window_to_front(app),
            "quit" => app.exit(0),
            "profile_silent" => {
                if let Err(e) = tauri_cmds::apply_power_profile(PowerProfile::Silent) {
                    tracing::warn!("tray: set silent failed: {e}");
                }
            }
            "profile_default" => {
                if let Err(e) = tauri_cmds::apply_power_profile(PowerProfile::Default) {
                    tracing::warn!("tray: set default failed: {e}");
                }
            }
            "profile_perf" => {
                if let Err(e) = tauri_cmds::apply_power_profile(PowerProfile::Performance) {
                    tracing::warn!("tray: set performance failed: {e}");
                }
            }
            "fan_auto" => {
                if let Err(e) = tauri_cmds::apply_fan_mode(FanIndex::Cpu, FanMode::Auto) {
                    tracing::warn!("tray: fan auto failed: {e}");
                }
            }
            "fan_full" => {
                if let Err(e) = tauri_cmds::apply_fan_mode(FanIndex::Cpu, FanMode::Full) {
                    tracing::warn!("tray: fan full failed: {e}");
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                bring_window_to_front(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn bring_window_to_front(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}
