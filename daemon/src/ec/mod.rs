use anyhow::{bail, Result};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[cfg(target_os = "linux")]
mod sys_linux;
#[cfg(target_os = "linux")]
pub use sys_linux::RawPortIo;

#[cfg(target_os = "windows")]
mod sys_windows;
#[cfg(target_os = "windows")]
pub use sys_windows::RawPortIo;

mod hw;
pub use hw::*;
mod offsets;
pub use offsets::*;

/// Platform-independent Embedded Controller hardware interface
pub struct EcDevice {
    /// Mutex wraps the low-level I/O backend.
    /// Locking it ensures atomic multi-step Super I/O transactions,
    /// preventing thread race conditions during Index/Data port writes.
    io: Mutex<RawPortIo>,
    /// Detected Super I/O base port
    port: u16,
    pub offsets: EcOffsets,
    pub hram_offset: u16,
    /// Wall-clock time (millis since UNIX epoch) when the I/O lock was last
    /// taken, or 0 when it's free. The watchdog thread reads this to detect
    /// hangs where someone is sitting on the lock for far too long (EC port
    /// transactions usually finish in micros, anything past a second means
    /// either a stuck SMI or a wedged batch).
    lock_held_since_ms: AtomicU64,
}

impl EcDevice {
    /// Initializes the EC interface and auto-detects the active port.
    pub fn new(insecure_mode: bool) -> Result<Self> {
        // Initialize the platform-specific low-level I/O
        let io = RawPortIo::new()?;

        let mut offsets = EcOffsets::DEFAULT_N155A;
        let motherboard = crate::services::get_board_name();

        // Probe for motherboard type
        if motherboard.contains("N155A") {
            log::info!("Detected motherboard N155A.");
        }
        else if motherboard.contains("N155C") {
            log::info!("Detected motherboard N155C.");
        }
        else if motherboard.contains("N155D") {
            log::info!("Detected motherboard N155D.");
            offsets = EcOffsets::DEFAULT_N155D;
        } else if !insecure_mode {
            // bail!("Unsupported motherboard: {}", motherboard);
            log::error!("Unsupported motherboard: {}", motherboard);
            log::error!("Be careful. This will panic in future updates!");
        }

        let mut device = Self {
            io: Mutex::new(io),
            port: 0,
            offsets,
            hram_offset: 0xFF,
            lock_held_since_ms: AtomicU64::new(0),
        };

        // On Windows 11 25H2 SCM started releasing services slightly before
        // the EC finishes its own power-on init, so the very first probe
        // can return ID 0xFF on every port. A short retry loop turns that
        // race into a non-issue without changing the happy-path latency
        // (first attempt almost always succeeds).
        const PROBE_ATTEMPTS: usize = 5;
        const PROBE_BACKOFF_MS: u64 = 400;
        let mut last_err = None;
        for attempt in 0..PROBE_ATTEMPTS {
            match device.probe_chip(insecure_mode) {
                Ok(()) => break,
                Err(e) => {
                    if attempt + 1 == PROBE_ATTEMPTS {
                        last_err = Some(e);
                        break;
                    }
                    log::warn!(
                        "EC probe attempt {}/{} failed ({e}); retrying in {} ms",
                        attempt + 1,
                        PROBE_ATTEMPTS,
                        PROBE_BACKOFF_MS
                    );
                    std::thread::sleep(std::time::Duration::from_millis(PROBE_BACKOFF_MS));
                }
            }
        }
        if let Some(e) = last_err {
            return Err(e);
        }

        let possible_bases: [u16; 5] = [0xC400, 0xC000, 0x0400, 0x0000, 0xE000];
        for &base in &possible_bases {
            // A REALLY(!) weak heuristic for detecting HRAM window
            if let Ok(temp) = device.read_reg(base + device.offsets.ram_temp_cpu) {
                if temp > 0x10 && temp < 0x50 {
                    device.hram_offset = base;
                    log::info!("HRAM Window detected by offset: {:#06X}. Temp: {}", base, temp);
                    break;
                }
            }
        }

        if device.hram_offset == 0xFF {
            bail!("Failed to detect HRAM window base address");
        }

        if device.hram_offset == 0xC400 {
            log::info!("EC base offset is 0xC400. Adjusting register offsets.");
            device.offsets.reg_kbd_backlight += 0xC000;
        }

        Ok(device)
    }

    /// Probes common Super I/O ports to find the ITE chip.
    fn probe_chip(&mut self, insecure_mode: bool) -> Result<()> {
        let probe_ports = [0x2E, 0x4E, 0x6E];

        for &p in &probe_ports {
            self.port = p;

            if let Ok(chip_id) = self.read_reg(0x2000) {
                if chip_id == 0x55 {
                    return Ok(()); // Successfully found IT5570
                }
                if chip_id == 0x81 || chip_id == 0x85 || chip_id == 0x89 || chip_id == 0x90 {
                    log::warn!("Warning: Found chip ID {:#X} at port {:#X}", chip_id, self.port);
                    log::warn!("Note: This chip may not be fully supported");
                    return Ok(());
                }
            }
        }

        if insecure_mode {
            log::warn!("ITE chip not detected on any known port.");
            log::warn!("INSECURE MODE: Proceeding blindly. Interacting with unknown hardware may cause system instability or damage!");
            Ok(())
        } else {
            bail!("ITE IT5570/IT8987 chip not found on any known port")
        }
    }

    /// Executes a closure safely within a locked Mutex context.
    /// This ensures atomic multi-step Super I/O transactions (like reading MSB and LSB),
    /// preventing thread race conditions and data tearing.
    pub fn with_batch<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&EcBatch) -> Result<R>,
    {
        let guard = self.io.lock().unwrap();

        // Mark the lock as held so the watchdog can spot batches that
        // overstay their welcome (e.g. EC stuck in an SMI).
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        self.lock_held_since_ms.store(now_ms, Ordering::Relaxed);
        let _release_guard = LockTimer {
            held: &self.lock_held_since_ms,
            taken_at: Instant::now(),
        };

        let batch = EcBatch {
            io: guard,
            port: self.port,
            hram_offset: self.hram_offset,
            offsets: &self.offsets,
        };

        f(&batch)
    }

    /// Returns the wall-clock millisecond timestamp when the lock was taken,
    /// or 0 when it's currently free. Used by the watchdog thread to flag
    /// abnormally long EC transactions.
    pub fn lock_age_ms(&self) -> u64 {
        let since = self.lock_held_since_ms.load(Ordering::Relaxed);
        if since == 0 {
            return 0;
        }
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(since);
        now_ms.saturating_sub(since)
    }

    // --- High-Level Facades ---
    pub fn read_reg(&self, addr: u16) -> Result<u8> {
        self.with_batch(|b| b.read_reg(addr))
    }

    pub fn write_reg(&self, addr: u16, val: u8) -> Result<()> {
        self.with_batch(|b| b.write_reg(addr, val))
    }

    pub fn read_ram(&self, offset: u16) -> Result<u8> {
        self.with_batch(|b| b.read_ram(offset))
    }

    pub fn write_ram(&self, offset: u16, val: u8) -> Result<()> {
        self.with_batch(|b| b.write_ram(offset, val))
    }
}

/// A short-lived transaction guard holding the hardware mutex.
/// Contains the actual low-level port read/write implementations.
pub struct EcBatch<'a> {
    io: std::sync::MutexGuard<'a, RawPortIo>,
    port: u16,
    pub hram_offset: u16,
    pub offsets: &'a EcOffsets,
}

impl<'a> EcBatch<'a> {
    /// Reads a single byte from the specified EC absolute register address.
    pub fn read_reg(&self, addr: u16) -> Result<u8> {
        let addr_high = (addr >> 8) as u8;
        let addr_low = (addr & 0xFF) as u8;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x11)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.outb(self.port + 1, addr_high)?;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x10)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.outb(self.port + 1, addr_low)?;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x12)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.inb(self.port + 1)
    }

    /// Writes a single byte to the specified EC absolute register address.
    pub fn write_reg(&self, addr: u16, val: u8) -> Result<()> {
        let addr_high = (addr >> 8) as u8;
        let addr_low = (addr & 0xFF) as u8;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x11)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.outb(self.port + 1, addr_high)?;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x10)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.outb(self.port + 1, addr_low)?;

        self.io.outb(self.port, 0x2E)?;
        self.io.outb(self.port + 1, 0x12)?;

        self.io.outb(self.port, 0x2F)?;
        self.io.outb(self.port + 1, val)?;

        Ok(())
    }

    // --- Hardware-Specific Helpers (Shared Memory Space) ---

    /// Reads a single byte from the HRAM window using the detected offset.
    pub fn read_ram(&self, offset: u16) -> Result<u8> {
        self.read_reg(self.hram_offset + offset)
    }

    /// Writes a single byte to the HRAM window using the detected offset.
    pub fn write_ram(&self, offset: u16, val: u8) -> Result<()> {
        self.write_reg(self.hram_offset + offset, val)
    }
}

/// RAII helper: clears the held-since marker and logs slow batches when the
/// `with_batch` closure returns (whether it succeeded or panicked).
struct LockTimer<'a> {
    held: &'a AtomicU64,
    taken_at: Instant,
}

impl Drop for LockTimer<'_> {
    fn drop(&mut self) {
        let elapsed = self.taken_at.elapsed();
        if elapsed.as_millis() > 500 {
            log::warn!(
                "EC batch held the I/O lock for {} ms — slow EC transaction",
                elapsed.as_millis()
            );
        }
        self.held.store(0, Ordering::Relaxed);
    }
}
