import { useEffect, useRef } from 'react'
import { useSettings, useViewport, useSystem } from '@mywallpaper/sdk-react'
import './styles.css'

interface Settings {
  showCPU: boolean
  showMemory: boolean
  showBattery: boolean
  showDisk: boolean
  showNetwork: boolean
  refreshInterval: '3s' | '5s' | '10s'
  backgroundColor: string
  textColor: string
  accentColor: string
  transparency: number
}

interface SystemInfo {
  os?: string
  cpu?: { cores: number; usage: number; model: string }
  memory?: { total: number; used: number; free: number }
  battery?: { level: number; charging: boolean; health?: number }
  disk?: Array<{ name: string; total: number; available: number; fs: string }>
  network?: Array<{ name: string; received: number; transmitted: number }>
}

export default function SystemMonitor() {
  const settings = useSettings<Partial<Settings>>()
  const { width, height } = useViewport()
  const systemData = useSystem() as SystemInfo
  // Track last update time via ref — updates when systemData changes (pushed by SDK)
  // without causing extra re-renders from a setInterval timer.
  const lastUpdateRef = useRef(Date.now())
  useEffect(() => {
    lastUpdateRef.current = Date.now()
  }, [systemData])

  const bg = settings.backgroundColor || '#1a1a2e'
  const text = settings.textColor || '#00ff88'
  const accent = settings.accentColor || '#00ccff'
  const opacity = settings.transparency ?? 0.85

  // Formatters
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatBytesPerSec = (bytes: number) => {
    const bps = formatBytes(bytes)
    return bps + '/s'
  }

  return (
    <div
      className="system-monitor"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: bg,
        opacity,
        color: text,
        fontFamily: '"Monaco", "Courier New", monospace',
        fontSize: `${Math.max(10, Math.min(14, height / 20))}px`,
        padding: '12px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '1.2em',
          fontWeight: 'bold',
          color: accent,
          borderBottom: `1px solid ${accent}`,
          paddingBottom: '6px',
          marginBottom: '4px',
        }}
      >
        SYSTEM MONITOR
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* CPU */}
        {(settings.showCPU !== false) && systemData.cpu && (
          <div className="metric">
            <div style={{ color: accent, fontWeight: 'bold' }}>CPU</div>
            <div>Cores: {systemData.cpu.cores}</div>
            <div>Usage: {systemData.cpu.usage.toFixed(1)}%</div>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#333',
                marginTop: '2px',
                overflow: 'hidden',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, systemData.cpu.usage)}%`,
                  backgroundColor: systemData.cpu.usage > 80 ? '#ff4444' : accent,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Memory */}
        {(settings.showMemory !== false) && systemData.memory && (
          <div className="metric">
            <div style={{ color: accent, fontWeight: 'bold' }}>MEMORY</div>
            <div>
              Used: {formatBytes(systemData.memory.used)} /{' '}
              {formatBytes(systemData.memory.total)}
            </div>
            <div>
              Free: {formatBytes(systemData.memory.free)}
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#333',
                marginTop: '2px',
                overflow: 'hidden',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(systemData.memory.used / systemData.memory.total) * 100}%`,
                  backgroundColor:
                    (systemData.memory.used / systemData.memory.total) * 100 > 80
                      ? '#ff4444'
                      : accent,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Battery */}
        {(settings.showBattery !== false) && systemData.battery && (
          <div className="metric">
            <div style={{ color: accent, fontWeight: 'bold' }}>BATTERY</div>
            <div>
              Level: {(systemData.battery.level * 100).toFixed(0)}%
              {systemData.battery.charging && ' ⚡ CHARGING'}
            </div>
            {systemData.battery.health !== undefined && (
              <div>Health: {(systemData.battery.health * 100).toFixed(0)}%</div>
            )}
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#333',
                marginTop: '2px',
                overflow: 'hidden',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${systemData.battery.level * 100}%`,
                  backgroundColor:
                    systemData.battery.level < 0.2
                      ? '#ff4444'
                      : systemData.battery.level < 0.5
                        ? '#ffaa00'
                        : accent,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Disk */}
        {(settings.showDisk === true) && systemData.disk && systemData.disk.length > 0 && (
          <div className="metric">
            <div style={{ color: accent, fontWeight: 'bold' }}>DISK</div>
            {systemData.disk.map((disk, idx) => (
              <div key={idx} style={{ fontSize: '0.9em', marginBottom: '4px' }}>
                <div>{disk.name}</div>
                <div>
                  {formatBytes(disk.available)} / {formatBytes(disk.total)} free
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    backgroundColor: '#333',
                    marginTop: '1px',
                    overflow: 'hidden',
                    borderRadius: '1px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${((disk.total - disk.available) / disk.total) * 100}%`,
                      backgroundColor:
                        ((disk.total - disk.available) / disk.total) * 100 > 80
                          ? '#ff4444'
                          : accent,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Network */}
        {(settings.showNetwork === true) && systemData.network && systemData.network.length > 0 && (
          <div className="metric">
            <div style={{ color: accent, fontWeight: 'bold' }}>NETWORK</div>
            {systemData.network.map((iface, idx) => (
              <div key={idx} style={{ fontSize: '0.9em', marginBottom: '4px' }}>
                <div>{iface.name}</div>
                <div>↓ {formatBytesPerSec(iface.received / 1000)}</div>
                <div>↑ {formatBytesPerSec(iface.transmitted / 1000)}</div>
              </div>
            ))}
          </div>
        )}

        {/* No data warning */}
        {!systemData.cpu &&
          !systemData.memory &&
          !systemData.battery && (
            <div style={{ color: '#ff6666', fontSize: '0.9em', marginTop: '8px' }}>
              ⚠ System data unavailable
              <div style={{ fontSize: '0.85em', marginTop: '4px', color: '#aaa' }}>
                Running in browser mode or desktop app not connected
              </div>
            </div>
          )}
      </div>

      {/* Footer */}
      <div
        style={{
          fontSize: '0.8em',
          color: '#666',
          borderTop: `1px solid ${accent}33`,
          paddingTop: '4px',
          marginTop: '4px',
        }}
      >
        Updated: {new Date(lastUpdateRef.current).toLocaleTimeString()}
      </div>
    </div>
  )
}
