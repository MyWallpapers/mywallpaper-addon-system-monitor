# System Monitor

A MyWallpaper Canvas add-on backed by one supervised Windows `process-v1`
companion per layer. It displays live CPU utilization, physical-memory usage,
and GPU engine utilization without injecting code into another process.

The companion uses only standard Windows APIs, receives layer settings from
the same manifest-backed source as Canvas, and changes its sampling interval
without restarting. Canvas reports connection, reconnection, stale-data and
sampling failures directly in the widget.

## Development

```powershell
corepack pnpm install
corepack pnpm dev
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

The companion aggregates per-process counters by physical engine and reports
the busiest engine, avoiding the false percentages produced by summing
independent 3D, copy and video engines.
