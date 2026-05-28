use std::path::PathBuf;
use std::sync::Arc;

use directories::ProjectDirs;
use parking_lot::Mutex;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_appender::rolling;
use tracing_subscriber::filter::EnvFilter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::reload;
use tracing_subscriber::util::SubscriberInitExt;

/// Returned from `init`; holds the appender worker guard so it isn't dropped,
/// plus a handle that lets `set_log_level` swap the filter at runtime.
pub struct LogControl {
    _guard: Mutex<Option<WorkerGuard>>,
    reload_handle: reload::Handle<EnvFilter, tracing_subscriber::Registry>,
    log_dir: PathBuf,
}

impl LogControl {
    pub fn log_dir(&self) -> &std::path::Path {
        &self.log_dir
    }

    pub fn current_log_file(&self) -> Option<PathBuf> {
        let date = chrono_today();
        let path = self.log_dir.join(format!("gui.log.{date}"));
        if path.exists() { Some(path) } else { None }
    }

    pub fn set_level(&self, level: &str) -> Result<(), String> {
        let filter = build_filter(level).map_err(|e| e.to_string())?;
        self.reload_handle
            .modify(|f| *f = filter)
            .map_err(|e| e.to_string())
    }
}

pub fn init(verbose: bool) -> Arc<LogControl> {
    let log_dir = resolve_log_dir();
    let _ = std::fs::create_dir_all(&log_dir);

    let appender = rolling::daily(&log_dir, "gui.log");
    let (file_writer, guard) = tracing_appender::non_blocking(appender);

    let initial_level = if verbose { "debug" } else { "info" };
    let filter =
        build_filter(initial_level).unwrap_or_else(|_| EnvFilter::new("info"));
    let (filter_layer, reload_handle) = reload::Layer::new(filter);

    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .with_ansi(true);

    let file_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .with_ansi(false)
        .with_writer(file_writer);

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(stdout_layer)
        .with(file_layer)
        .init();

    tracing::info!("logging initialised at {}", log_dir.display());

    Arc::new(LogControl {
        _guard: Mutex::new(Some(guard)),
        reload_handle,
        log_dir,
    })
}

fn build_filter(level: &str) -> Result<EnvFilter, tracing_subscriber::filter::ParseError> {
    // Allow either bare levels ("debug") or full EnvFilter syntax via
    // RUST_LOG-style strings. Default targets focus on our own crates so a
    // 'debug' setting doesn't drown the user in webview noise.
    let s = match level {
        "trace" | "debug" | "info" | "warn" | "error" => {
            format!("{level},lecoo_gui_lib={level},gui={level}")
        }
        other => other.to_string(),
    };
    EnvFilter::try_new(&s)
}

fn resolve_log_dir() -> PathBuf {
    // Legacy: keep the "Lecoo Control Center" project name (with spaces) even though
    // the installer now ships under "LecooControlCenter". Renaming this would migrate
    // existing users' log history to a new %LOCALAPPDATA% folder and lose it.
    if let Some(dirs) = ProjectDirs::from("com", "amid13", "Lecoo Control Center") {
        return dirs.data_local_dir().join("logs");
    }
    // Last-resort fallback — adjacent to the executable.
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("logs")))
        .unwrap_or_else(|| PathBuf::from("logs"))
}

/// Today's date in YYYY-MM-DD as written by tracing-appender. We avoid pulling
/// `chrono` for one date string and use SystemTime arithmetic instead.
fn chrono_today() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, m, d) = civil_from_days((secs / 86_400) as i64);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Howard Hinnant's days-from-civil inverse, see https://howardhinnant.github.io/date_algorithms.html
fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y } as i32;
    (y, m, d)
}
