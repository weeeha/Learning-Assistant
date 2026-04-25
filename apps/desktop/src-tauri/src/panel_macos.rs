//! macOS-specific window styling for the floating panel.
//!
//! v1 keeps this minimal:
//!   - Bumps the window level so it floats above normal app windows.
//!   - Sets a collection behavior that makes it visible on all Spaces and
//!     above fullscreen apps.
//!
//! Promotion to a true `NSPanel` (with `nonactivating` style and proper Spotlight
//! semantics) is a polish item — when we want it, we'll pull in
//! `tauri-plugin-nspanel`. For now this is enough to feel right on macOS.
#![cfg(target_os = "macos")]
#![allow(deprecated)]

use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
use cocoa::base::id;
use objc::{msg_send, sel, sel_impl};
use tauri::WebviewWindow;

const NS_STATUS_WINDOW_LEVEL: i64 = 25;

pub fn apply_panel_style(window: &WebviewWindow) {
    let ns_window: id = match window.ns_window() {
        Ok(handle) => handle as id,
        Err(_) => return,
    };

    unsafe {
        let _: () = msg_send![ns_window, setLevel: NS_STATUS_WINDOW_LEVEL];

        let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary;
        ns_window.setCollectionBehavior_(behavior);

        let _: () = msg_send![ns_window, setHidesOnDeactivate: false];
        let _: () = msg_send![ns_window, setMovableByWindowBackground: true];
    }
}
