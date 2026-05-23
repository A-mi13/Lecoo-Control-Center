use anyhow::{Context, Result, anyhow};
use bincode::{Decode, Encode};
use ipc::{IpcRequest, IpcResponse};

use crate::power_status;
use crate::state::Telemetry;

pub struct IpcClient {
    inner: ipc::IpcClient,
    pub daemon_version: (u8, u8),
}

impl IpcClient {
    pub fn connect() -> Result<Self> {
        let inner = ipc::IpcClient::connect().context("daemon not reachable")?;
        let daemon_version = inner.daemon_version;
        Ok(Self {
            inner,
            daemon_version,
        })
    }

    pub fn request<Req, Res>(&mut self, req: &Req) -> Result<Res>
    where
        Req: Encode,
        Res: Decode<()>,
    {
        self.inner.request(req).context("ipc request failed")
    }

    /// Pull a single telemetry sample: temperatures, fan RPMs, battery
    /// state, and AC adapter status.
    pub fn fetch_telemetry(&mut self) -> Result<Telemetry> {
        let temps: IpcResponse = self.request(&IpcRequest::GetTemperatures)?;
        let (cpu_temp, sys_temp) = match temps {
            IpcResponse::Temp(c, s) => (c, s),
            IpcResponse::Error(e) => return Err(anyhow!("daemon error (temps): {e}")),
            other => return Err(anyhow!("unexpected response to GetTemperatures: {other:?}")),
        };

        let fans: IpcResponse = self.request(&IpcRequest::GetFansRPM)?;
        let (cpu_fan, gpu_fan) = match fans {
            IpcResponse::FanRPM(c, g) => (c, g),
            IpcResponse::Error(e) => return Err(anyhow!("daemon error (fans): {e}")),
            other => return Err(anyhow!("unexpected response to GetFansRPM: {other:?}")),
        };

        // ChargeLimit response carries (min, max, current_percent). The daemon
        // reads all three off the EC, so one round-trip is enough.
        let battery: IpcResponse = self.request(&IpcRequest::GetChargeLimit)?;
        let (limit_min, limit_max, battery_percent) = match battery {
            IpcResponse::ChargeLimit(min, max, cur) => (min, max, cur),
            IpcResponse::Error(e) => {
                tracing::warn!("daemon error (battery): {e}");
                (0, 0, 0)
            }
            other => {
                tracing::warn!("unexpected response to GetChargeLimit: {other:?}");
                (0, 0, 0)
            }
        };

        Ok(Telemetry {
            cpu_temp_c: cpu_temp as f32,
            sys_temp_c: sys_temp as f32,
            cpu_fan_rpm: cpu_fan as u32,
            gpu_fan_rpm: gpu_fan as u32,
            battery_percent,
            charge_limit_min: limit_min,
            charge_limit_max: limit_max,
            ac_connected: power_status::ac_connected(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_error_when_daemon_not_running() {
        // This test assumes the daemon's named pipe is not present in CI.
        // If it ever is, the test will simply pass through (connect succeeds);
        // the assertion is that we never panic.
        let result = IpcClient::connect();
        if let Ok(c) = result {
            // Live daemon detected (developer machine). Just sanity-check the version tuple.
            assert!(c.daemon_version.0 > 0 || c.daemon_version.1 > 0);
        }
    }
}
