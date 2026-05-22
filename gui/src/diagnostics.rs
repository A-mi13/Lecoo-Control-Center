use std::io::{Read, Seek, SeekFrom};
use std::sync::Arc;

use crate::logging::LogControl;
use crate::state::{AppState, ConnectionStatus};

/// Number of log lines to include in the diagnostics bundle.
const TAIL_LINES: usize = 200;

pub fn collect(app_state: &Arc<AppState>, log_ctl: &Arc<LogControl>) -> String {
    let mut buf = String::new();

    buf.push_str("### Lecoo Control Center — diagnostics\n\n");
    buf.push_str("Paste this block into your GitHub issue.\n\n");

    buf.push_str("**Versions**\n");
    buf.push_str(&format!(
        "- GUI: {}\n",
        env!("CARGO_PKG_VERSION"),
    ));
    if let Some(git) = option_env!("LECOO_GIT_SHA") {
        buf.push_str(&format!("- Git: {git}\n"));
    }
    buf.push_str(&format!("- OS: {}\n", std::env::consts::OS));
    buf.push_str(&format!("- Arch: {}\n", std::env::consts::ARCH));

    match &*app_state.connection.read() {
        ConnectionStatus::Connected { daemon_version } => {
            buf.push_str(&format!(
                "- Daemon: v{}.{} (connected)\n",
                daemon_version.0, daemon_version.1
            ));
        }
        ConnectionStatus::Connecting => buf.push_str("- Daemon: (connecting)\n"),
        ConnectionStatus::Disconnected => buf.push_str("- Daemon: (disconnected)\n"),
        ConnectionStatus::Error { message } => {
            buf.push_str(&format!("- Daemon: (error: {message})\n"));
        }
    }
    buf.push('\n');

    buf.push_str("**Last connection error**\n");
    match &*app_state.last_connection_error.read() {
        Some(e) => buf.push_str(&format!("```\n{e}\n```\n\n")),
        None => buf.push_str("(none)\n\n"),
    }

    buf.push_str("**Log tail**\n");
    buf.push_str(&format!("Folder: `{}`\n\n", log_ctl.log_dir().display()));
    match read_tail(log_ctl) {
        Ok(lines) if !lines.is_empty() => {
            buf.push_str("```\n");
            buf.push_str(&lines);
            buf.push_str("\n```\n");
        }
        Ok(_) => buf.push_str("(empty)\n"),
        Err(e) => buf.push_str(&format!("(could not read log: {e})\n")),
    }

    buf
}

fn read_tail(log_ctl: &Arc<LogControl>) -> std::io::Result<String> {
    let Some(path) = log_ctl.current_log_file() else {
        return Ok(String::new());
    };

    let mut file = std::fs::File::open(path)?;
    let len = file.metadata()?.len();

    // Read at most the last 64 KiB — enough for hundreds of lines.
    let window = 64 * 1024u64;
    let offset = len.saturating_sub(window);
    file.seek(SeekFrom::Start(offset))?;
    let mut bytes = Vec::with_capacity(window.min(len) as usize);
    file.read_to_end(&mut bytes)?;
    let text = String::from_utf8_lossy(&bytes).into_owned();

    let mut lines: Vec<&str> = text.lines().collect();
    if lines.len() > TAIL_LINES {
        lines = lines.split_off(lines.len() - TAIL_LINES);
    }
    Ok(lines.join("\n"))
}
