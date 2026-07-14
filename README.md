# System Monitor

A MyWallpaper Canvas add-on backed by one supervised Windows `process-v2`
companion per layer. It displays live CPU utilization, physical-memory usage,
and GPU engine utilization without injecting code into another process.

The companion uses only standard Windows APIs, receives layer settings from
the same manifest-backed source as Canvas, and changes its sampling interval
without restarting. Canvas reports connection, reconnection, stale-data and
sampling failures directly in the widget. Missing or unknown refresh intervals
fail the companion session with a visible `settings-invalid` error instead of
silently changing the requested rate.

It implements MyWallpaper's
[surface-aware companion protocol v2](https://github.com/MyWallpapers/MyWallpaper/blob/main/docs/native-addons.md#companion-protocol-v2),
broadcasting each hardware sample to both the wallpaper and interface views of
the same layer.

## Development

Use Node.js 22 or newer and the pnpm version pinned by `packageManager`:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

For the complete native preview, run `mywallpaper dev` from this directory
with the released `@mywallpaper/cli`, enable Developer Mode in MyWallpaper
Desktop, then load the loopback URL shown by the CLI. Official tags use
MyWallpaper's reusable OIDC workflow to rebuild x64 and ARM64 executables from
source; binaries are not committed.

## Native boundary

- CPU: `GetSystemTimes`
- physical memory: `GlobalMemoryStatusEx`
- GPU identity and dedicated memory: DXGI
- GPU engine utilization: Windows PDH `GPU Engine` counters

The companion keeps the LUID of the first non-software adapter selected by
DXGI, ignores PDH instances belonging to every other adapter, then aggregates
the selected adapter's per-process counters by physical engine and reports its
busiest engine. The displayed name, memory and utilization therefore always
describe the same GPU.
