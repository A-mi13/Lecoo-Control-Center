//! Minimal "check for updates" flow.
//!
//! We can't ship Tauri's full updater (yet) because that requires a signed
//! MSI plus a hosted `latest.json` — both are part of the future signed
//! release work. Until then, we just query the GitHub Releases API for the
//! latest tag, compare it to our embedded version, and surface that to the
//! user; downloading and replacing the MSI stays a manual step.

use serde::{Deserialize, Serialize};

// We list all releases instead of hitting /releases/latest, because the
// "latest" endpoint hides anything flagged as prerelease — and during the
// beta cycle every release is a prerelease, which would mean a permanent
// 404 here. We pick the first release in the array (GitHub returns them
// in published-at descending order).
const GITHUB_API_URL: &str =
    "https://api.github.com/repos/A-mi13/Lecoo-Control-Center/releases?per_page=10";

#[derive(Debug, Deserialize)]
struct GhRelease {
    tag_name: String,
    html_url: String,
    name: Option<String>,
    body: Option<String>,
    #[serde(default)]
    prerelease: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_url: String,
    pub release_name: Option<String>,
    pub release_notes: Option<String>,
    pub prerelease: bool,
}

pub fn check_for_update() -> Result<UpdateCheck, String> {
    let user_agent = concat!(
        "Lecoo-Control-Center/",
        env!("CARGO_PKG_VERSION"),
        " (+https://github.com/A-mi13/Lecoo-Control-Center)"
    );

    let releases: Vec<GhRelease> = ureq::get(GITHUB_API_URL)
        .header("User-Agent", user_agent)
        .header("Accept", "application/vnd.github+json")
        .call()
        .map_err(|e| e.to_string())?
        .body_mut()
        .read_json()
        .map_err(|e| e.to_string())?;

    let release = releases
        .into_iter()
        .next()
        .ok_or_else(|| "no releases published yet".to_string())?;

    let latest = release.tag_name.trim_start_matches('v').to_string();
    let current = env!("CARGO_PKG_VERSION").to_string();

    Ok(UpdateCheck {
        update_available: is_newer(&latest, &current),
        current_version: current,
        latest_version: latest,
        release_url: release.html_url,
        release_name: release.name,
        release_notes: release.body,
        prerelease: release.prerelease,
    })
}

/// Strict-but-tolerant semver comparison. We only ever look at numeric
/// components (`0.2.0` vs `0.1.4`) and treat everything after the patch
/// (`-rc.1`) as "older than the same version without a suffix".
fn is_newer(candidate: &str, baseline: &str) -> bool {
    let cmp = compare_version(candidate, baseline);
    cmp == std::cmp::Ordering::Greater
}

fn compare_version(a: &str, b: &str) -> std::cmp::Ordering {
    let parse = |s: &str| {
        let (numeric, _) = s.split_once('-').unwrap_or((s, ""));
        let parts: Vec<u64> = numeric
            .split('.')
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect();
        let has_suffix = s.contains('-');
        (parts, has_suffix)
    };

    let (a_parts, a_pre) = parse(a);
    let (b_parts, b_pre) = parse(b);
    let len = a_parts.len().max(b_parts.len());
    for i in 0..len {
        let x = a_parts.get(i).copied().unwrap_or(0);
        let y = b_parts.get(i).copied().unwrap_or(0);
        if x != y {
            return x.cmp(&y);
        }
    }
    // Same numeric prefix: a non-prerelease is newer than a prerelease.
    match (a_pre, b_pre) {
        (false, true) => std::cmp::Ordering::Greater,
        (true, false) => std::cmp::Ordering::Less,
        _ => std::cmp::Ordering::Equal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cmp::Ordering;

    #[test]
    fn newer_patch_wins() {
        assert!(is_newer("0.1.1", "0.1.0"));
    }

    #[test]
    fn newer_minor_wins() {
        assert!(is_newer("0.2.0", "0.1.99"));
    }

    #[test]
    fn equal_is_not_newer() {
        assert!(!is_newer("0.1.0", "0.1.0"));
    }

    #[test]
    fn prerelease_is_older_than_same_release() {
        assert_eq!(compare_version("0.1.0-rc.1", "0.1.0"), Ordering::Less);
        assert!(is_newer("0.1.0", "0.1.0-rc.1"));
    }
}
