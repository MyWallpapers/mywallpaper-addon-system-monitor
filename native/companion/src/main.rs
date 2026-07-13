use std::collections::HashMap;
use std::io::{self, Read, Write};
use std::mem::{align_of, size_of};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::FILETIME;
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory1, IDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE,
};
use windows::Win32::System::Performance::{
    PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterArrayW,
    PdhOpenQueryW, PDH_CSTATUS_NEW_DATA, PDH_CSTATUS_VALID_DATA, PDH_FMT_COUNTERVALUE_ITEM_W,
    PDH_FMT_DOUBLE, PDH_HCOUNTER, PDH_HQUERY, PDH_MORE_DATA,
};
use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
use windows::Win32::System::Threading::GetSystemTimes;

const PROTOCOL_VERSION: u32 = 1;
const MAX_FRAME_BYTES: usize = 1024 * 1024;

#[derive(Deserialize)]
#[serde(tag = "type")]
enum HostFrame {
    #[serde(rename = "init")]
    Init {
        v: u32,
        #[serde(rename = "layerSettings")]
        layer_settings: Value,
    },
    #[serde(rename = "settings")]
    Settings {
        v: u32,
        #[serde(rename = "layerSettings")]
        layer_settings: Value,
    },
    #[serde(rename = "message")]
    Message { v: u32 },
    #[serde(rename = "shutdown")]
    Shutdown { v: u32 },
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum CompanionFrame<T: Serialize> {
    #[serde(rename = "ready")]
    Ready { v: u32 },
    #[serde(rename = "message")]
    Message { v: u32, payload: T },
    #[serde(rename = "error")]
    Error {
        v: u32,
        message: String,
        code: String,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind")]
enum Payload {
    #[serde(rename = "system.sample")]
    Sample(SystemSample),
    #[serde(rename = "system.error")]
    Error { message: String },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemSample {
    captured_at_unix_ms: u128,
    cpu: CpuSample,
    memory: MemorySample,
    gpu: Option<GpuSample>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CpuSample {
    usage_percent: f64,
    logical_processors: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MemorySample {
    used_bytes: u64,
    total_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GpuSample {
    name: String,
    usage_percent: Option<f64>,
    dedicated_total_bytes: u64,
}

struct Control {
    running: bool,
    interval: Duration,
}

struct Sampler {
    previous_cpu: Option<CpuTimes>,
    gpu: Option<GpuAdapter>,
    gpu_utilization: Option<GpuUtilization>,
}

#[derive(Clone, Copy)]
struct CpuTimes {
    idle: u64,
    kernel: u64,
    user: u64,
}

struct GpuAdapter {
    name: String,
    dedicated_total_bytes: u64,
}

struct GpuUtilization {
    query: PDH_HQUERY,
    counter: PDH_HCOUNTER,
}

fn main() -> Result<(), String> {
    if std::env::var("MYWALLPAPER_PROTOCOL").as_deref() != Ok("process-v1") {
        return Err("MYWALLPAPER_PROTOCOL must be process-v1".to_owned());
    }

    let output = Arc::new(Mutex::new(io::stdout()));
    let control = Arc::new((
        Mutex::new(Control {
            running: true,
            interval: Duration::from_secs(1),
        }),
        Condvar::new(),
    ));
    let mut initialized = false;
    let mut sampler_thread = None;
    let mut input = io::stdin();

    while let Some(frame) =
        read_frame::<HostFrame>(&mut input).map_err(|error| error.to_string())?
    {
        let version = match &frame {
            HostFrame::Init { v, .. }
            | HostFrame::Settings { v, .. }
            | HostFrame::Message { v }
            | HostFrame::Shutdown { v } => *v,
        };
        if version != PROTOCOL_VERSION {
            write_frame(
                &output,
                &CompanionFrame::<Value>::Error {
                    v: PROTOCOL_VERSION,
                    message: format!("unsupported protocol version {version}"),
                    code: "protocol-version".to_owned(),
                },
            )?;
            break;
        }
        match frame {
            HostFrame::Init { layer_settings, .. } if !initialized => {
                set_interval(&control, &layer_settings);
                write_frame(
                    &output,
                    &CompanionFrame::<Value>::Ready {
                        v: PROTOCOL_VERSION,
                    },
                )?;
                initialized = true;
                let thread_output = output.clone();
                let thread_control = control.clone();
                sampler_thread = Some(thread::spawn(move || {
                    run_sampler(thread_control, thread_output)
                }));
            }
            HostFrame::Settings { layer_settings, .. } if initialized => {
                set_interval(&control, &layer_settings);
            }
            HostFrame::Message { .. } if initialized => {}
            HostFrame::Shutdown { .. } => break,
            _ => {
                write_frame(
                    &output,
                    &CompanionFrame::<Value>::Error {
                        v: PROTOCOL_VERSION,
                        message: "invalid companion lifecycle frame".to_owned(),
                        code: "protocol-state".to_owned(),
                    },
                )?;
                break;
            }
        }
    }

    {
        let (lock, wake) = &*control;
        let mut state = lock
            .lock()
            .map_err(|_| "control lock poisoned".to_owned())?;
        state.running = false;
        wake.notify_all();
    }
    if let Some(handle) = sampler_thread {
        handle
            .join()
            .map_err(|_| "sampler thread panicked".to_owned())?;
    }
    Ok(())
}

fn run_sampler(control: Arc<(Mutex<Control>, Condvar)>, output: Arc<Mutex<io::Stdout>>) {
    let mut sampler = Sampler::new();
    loop {
        let payload = match sampler.sample() {
            Ok(sample) => Payload::Sample(sample),
            Err(message) => Payload::Error { message },
        };
        if let Err(error) = write_frame(
            &output,
            &CompanionFrame::Message {
                v: PROTOCOL_VERSION,
                payload,
            },
        ) {
            eprintln!("native companion output failed: {error}");
            return;
        }

        let (lock, wake) = &*control;
        let state = match lock.lock() {
            Ok(state) => state,
            Err(_) => return,
        };
        if !state.running {
            return;
        }
        let interval = state.interval;
        let (state, _) = match wake.wait_timeout(state, interval) {
            Ok(result) => result,
            Err(_) => return,
        };
        if !state.running {
            return;
        }
    }
}

impl Sampler {
    fn new() -> Self {
        Self {
            previous_cpu: None,
            gpu: GpuAdapter::discover(),
            gpu_utilization: GpuUtilization::open(),
        }
    }

    fn sample(&mut self) -> Result<SystemSample, String> {
        let current_cpu = cpu_times()?;
        let usage_percent = self
            .previous_cpu
            .map(|previous| cpu_usage(previous, current_cpu))
            .unwrap_or(0.0);
        self.previous_cpu = Some(current_cpu);
        let memory = memory_sample()?;
        let gpu_usage = self
            .gpu_utilization
            .as_ref()
            .and_then(GpuUtilization::sample);
        let gpu = self.gpu.as_ref().map(|adapter| GpuSample {
            name: adapter.name.clone(),
            usage_percent: gpu_usage,
            dedicated_total_bytes: adapter.dedicated_total_bytes,
        });
        Ok(SystemSample {
            captured_at_unix_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|_| "system clock is before the Unix epoch".to_owned())?
                .as_millis(),
            cpu: CpuSample {
                usage_percent,
                logical_processors: thread::available_parallelism()
                    .map(|count| count.get())
                    .unwrap_or(1),
            },
            memory,
            gpu,
        })
    }
}

impl GpuAdapter {
    fn discover() -> Option<Self> {
        unsafe {
            let factory: IDXGIFactory1 = CreateDXGIFactory1().ok()?;
            for index in 0..32 {
                let Ok(adapter) = factory.EnumAdapters1(index) else {
                    break;
                };
                let Ok(description) = adapter.GetDesc1() else {
                    continue;
                };
                if description.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0 {
                    continue;
                }
                let end = description
                    .Description
                    .iter()
                    .position(|character| *character == 0)
                    .unwrap_or(description.Description.len());
                return Some(Self {
                    name: String::from_utf16_lossy(&description.Description[..end]),
                    dedicated_total_bytes: description.DedicatedVideoMemory as u64,
                });
            }
        }
        None
    }
}

impl GpuUtilization {
    fn open() -> Option<Self> {
        unsafe {
            let mut query = PDH_HQUERY::default();
            if PdhOpenQueryW(PCWSTR::null(), 0, &mut query) != 0 {
                return None;
            }
            let mut counter = PDH_HCOUNTER::default();
            if PdhAddEnglishCounterW(
                query,
                w!(r"\GPU Engine(*)\Utilization Percentage"),
                0,
                &mut counter,
            ) != 0
            {
                PdhCloseQuery(query);
                return None;
            }
            if PdhCollectQueryData(query) != 0 {
                PdhCloseQuery(query);
                return None;
            }
            Some(Self { query, counter })
        }
    }

    fn sample(&self) -> Option<f64> {
        unsafe {
            if PdhCollectQueryData(self.query) != 0 {
                return None;
            }
            let mut buffer_size = 0_u32;
            let mut item_count = 0_u32;
            let status = PdhGetFormattedCounterArrayW(
                self.counter,
                PDH_FMT_DOUBLE,
                &mut buffer_size,
                &mut item_count,
                None,
            );
            if status != PDH_MORE_DATA || buffer_size == 0 || item_count == 0 {
                return None;
            }
            let words = (buffer_size as usize + align_of::<usize>() - 1) / align_of::<usize>();
            let mut buffer = vec![0_usize; words];
            let items = buffer.as_mut_ptr().cast::<PDH_FMT_COUNTERVALUE_ITEM_W>();
            if PdhGetFormattedCounterArrayW(
                self.counter,
                PDH_FMT_DOUBLE,
                &mut buffer_size,
                &mut item_count,
                Some(items),
            ) != 0
            {
                return None;
            }
            if item_count as usize * size_of::<PDH_FMT_COUNTERVALUE_ITEM_W>() > buffer_size as usize
            {
                return None;
            }
            let mut engines = HashMap::<String, f64>::new();
            for item in std::slice::from_raw_parts(items, item_count as usize) {
                if item.FmtValue.CStatus != PDH_CSTATUS_VALID_DATA
                    && item.FmtValue.CStatus != PDH_CSTATUS_NEW_DATA
                {
                    continue;
                }
                let value = item.FmtValue.Anonymous.doubleValue;
                if !value.is_finite() || value < 0.0 {
                    continue;
                }
                let name = item.szName.to_string().ok()?;
                let engine = name
                    .find("_luid_")
                    .map(|index| &name[index..])
                    .unwrap_or(name.as_str())
                    .to_owned();
                *engines.entry(engine).or_default() += value;
            }
            engines
                .into_values()
                .reduce(f64::max)
                .map(|value| value.clamp(0.0, 100.0))
        }
    }
}

impl Drop for GpuUtilization {
    fn drop(&mut self) {
        unsafe {
            PdhCloseQuery(self.query);
        }
    }
}

fn cpu_times() -> Result<CpuTimes, String> {
    unsafe {
        let mut idle = FILETIME::default();
        let mut kernel = FILETIME::default();
        let mut user = FILETIME::default();
        GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user))
            .map_err(|error| format!("GetSystemTimes failed: {error}"))?;
        Ok(CpuTimes {
            idle: filetime_value(idle),
            kernel: filetime_value(kernel),
            user: filetime_value(user),
        })
    }
}

fn cpu_usage(previous: CpuTimes, current: CpuTimes) -> f64 {
    let idle = current.idle.saturating_sub(previous.idle);
    let kernel = current.kernel.saturating_sub(previous.kernel);
    let user = current.user.saturating_sub(previous.user);
    let total = kernel.saturating_add(user);
    if total == 0 {
        0.0
    } else {
        ((total.saturating_sub(idle)) as f64 / total as f64 * 100.0).clamp(0.0, 100.0)
    }
}

fn filetime_value(value: FILETIME) -> u64 {
    ((value.dwHighDateTime as u64) << 32) | value.dwLowDateTime as u64
}

fn memory_sample() -> Result<MemorySample, String> {
    unsafe {
        let mut status = MEMORYSTATUSEX {
            dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
            ..Default::default()
        };
        GlobalMemoryStatusEx(&mut status)
            .map_err(|error| format!("GlobalMemoryStatusEx failed: {error}"))?;
        Ok(MemorySample {
            used_bytes: status.ullTotalPhys.saturating_sub(status.ullAvailPhys),
            total_bytes: status.ullTotalPhys,
        })
    }
}

fn set_interval(control: &Arc<(Mutex<Control>, Condvar)>, settings: &Value) {
    let interval = match settings.get("refreshInterval").and_then(Value::as_str) {
        Some("5s") => Duration::from_secs(5),
        Some("2s") => Duration::from_secs(2),
        _ => Duration::from_secs(1),
    };
    let (lock, wake) = &**control;
    if let Ok(mut state) = lock.lock() {
        state.interval = interval;
        wake.notify_all();
    }
}

fn read_frame<T: for<'de> Deserialize<'de>>(reader: &mut impl Read) -> io::Result<Option<T>> {
    let mut prefix = [0_u8; 4];
    match reader.read(&mut prefix[..1])? {
        0 => return Ok(None),
        1 => reader.read_exact(&mut prefix[1..])?,
        _ => unreachable!(),
    }
    let length = u32::from_le_bytes(prefix) as usize;
    if length == 0 || length > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "invalid frame length",
        ));
    }
    let mut payload = vec![0; length];
    reader.read_exact(&mut payload)?;
    serde_json::from_slice(&payload)
        .map(Some)
        .map_err(io::Error::other)
}

fn write_frame<T: Serialize>(output: &Arc<Mutex<io::Stdout>>, value: &T) -> Result<(), String> {
    let payload = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    if payload.is_empty() || payload.len() > MAX_FRAME_BYTES {
        return Err("outbound frame has an invalid size".to_owned());
    }
    let mut output = output
        .lock()
        .map_err(|_| "output lock poisoned".to_owned())?;
    output
        .write_all(&(payload.len() as u32).to_le_bytes())
        .and_then(|()| output.write_all(&payload))
        .and_then(|()| output.flush())
        .map_err(|error| error.to_string())
}
