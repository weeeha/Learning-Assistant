use std::path::PathBuf;
use std::process::Command;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod panel_macos;

const PANEL_LABEL: &str = "panel";
const MAIN_LABEL: &str = "main";
const TOGGLE_HOTKEY: &str = "CmdOrCtrl+Shift+L";

#[tauri::command]
fn capture_screenshot(app: AppHandle) -> Result<String, String> {
    // Use macOS `screencapture -i` for an interactive selection. This pops
    // the system crosshair cursor; the user picks a region or window. The
    // captured PNG is written into the app data dir.
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("captures");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let filename = format!("screenshot-{}.png", chrono::Utc::now().timestamp_millis());
    let target: PathBuf = dir.join(&filename);

    let status = Command::new("/usr/sbin/screencapture")
        .arg("-i")
        .arg("-x")
        .arg(&target)
        .status()
        .map_err(|e| format!("failed to invoke screencapture: {e}"))?;

    if !status.success() {
        return Err("screencapture exited non-zero (cancelled?)".into());
    }
    if !target.exists() {
        return Err("screenshot was cancelled".into());
    }

    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
async fn open_main_window(app: AppHandle, session_id: Option<String>) -> Result<(), String> {
    let url_path = match session_id {
        Some(id) if !id.is_empty() => format!("/main?session={id}"),
        _ => "/main".to_string(),
    };

    if let Some(existing) = app.get_webview_window(MAIN_LABEL) {
        existing
            .set_focus()
            .map_err(|e| e.to_string())?;
        let target = format!("http://localhost:3000{url_path}");
        existing
            .eval(&format!("window.location.href = '{target}';"))
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let url = format!("http://localhost:3000{url_path}");
    let parsed = url
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;
    WebviewWindowBuilder::new(&app, MAIN_LABEL, WebviewUrl::External(parsed))
        .title("Learning Assistant")
        .inner_size(1100.0, 740.0)
        .min_inner_size(720.0, 480.0)
        .resizable(true)
        .decorations(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_panel(app: AppHandle) -> Result<(), String> {
    if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
        if panel.is_visible().unwrap_or(false) {
            panel.hide().map_err(|e| e.to_string())?;
        } else {
            panel.show().map_err(|e| e.to_string())?;
            panel.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let target: Shortcut = TOGGLE_HOTKEY.parse().expect("hotkey parse");
                    if shortcut == &target && event.state() == ShortcutState::Pressed {
                        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
                            let visible = panel.is_visible().unwrap_or(false);
                            if visible {
                                let _ = panel.hide();
                            } else {
                                let _ = panel.show();
                                let _ = panel.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Register the global hotkey. Failure is non-fatal — the panel button
            // can still be used; we just log a warning.
            let shortcut: Shortcut = TOGGLE_HOTKEY.parse()?;
            if let Err(e) = app.global_shortcut().register(shortcut) {
                log::warn!("Failed to register global shortcut: {e}");
            }

            // On macOS, give the panel window the proper NSPanel-style behavior:
            // - Floats above other windows
            // - Visible across all spaces
            // - Doesn't steal focus when shown
            #[cfg(target_os = "macos")]
            if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
                panel_macos::apply_panel_style(&panel);
            }

            // Pass the OS-resolved app data dir to the Next.js dev server so the
            // sidecar reads/writes the same SQLite file Tauri sees.
            if let Ok(dir) = app.path().app_data_dir() {
                std::env::set_var("LA_DATA_DIR", dir);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_screenshot,
            open_main_window,
            toggle_panel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
