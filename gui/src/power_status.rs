//! Thin wrapper around Windows' GetSystemPowerStatus, used by the poller to
//! decide whether the battery is currently charging. We deliberately avoid
//! pulling in the full `windows-sys` crate for one function — the FFI here
//! is two lines.

#[cfg(target_os = "windows")]
mod imp {
    #[repr(C)]
    #[allow(non_snake_case)]
    struct SystemPowerStatus {
        ACLineStatus: u8,
        BatteryFlag: u8,
        BatteryLifePercent: u8,
        SystemStatusFlag: u8,
        BatteryLifeTime: u32,
        BatteryFullLifeTime: u32,
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn GetSystemPowerStatus(lpSystemPowerStatus: *mut SystemPowerStatus) -> i32;
    }

    /// Returns Some(true) when the AC adapter is plugged in, Some(false) when
    /// running on battery, None when the OS couldn't tell us (status byte
    /// 255 = "unknown" per Microsoft docs, or the syscall failed outright).
    pub fn ac_connected() -> Option<bool> {
        let mut status = SystemPowerStatus {
            ACLineStatus: 255,
            BatteryFlag: 255,
            BatteryLifePercent: 255,
            SystemStatusFlag: 0,
            BatteryLifeTime: 0,
            BatteryFullLifeTime: 0,
        };

        let ok = unsafe { GetSystemPowerStatus(&mut status as *mut _) };
        if ok == 0 {
            return None;
        }
        match status.ACLineStatus {
            0 => Some(false),
            1 => Some(true),
            _ => None,
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod imp {
    pub fn ac_connected() -> Option<bool> {
        None
    }
}

pub use imp::ac_connected;
