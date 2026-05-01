const __MYWALLPAPER_WIDGET_RUNTIME_CONTRACT__ = "1";
if (!__canvasRuntime) {
      throw new Error('Canvas runtime globals are unavailable');
    }
if (!__canvasRuntime.react || !__canvasRuntime.reactJsxRuntime || !__canvasRuntime.sdkReact || !__canvasRuntime.sdkContracts || !__canvasRuntime.sdkPermissions) {
      throw new Error('Canvas runtime globals are unavailable');
    }
const __canvasRuntimeReact = __canvasRuntime.react;
const __canvasRuntimeJsxRuntime = __canvasRuntime.reactJsxRuntime;
const __canvasRuntimeSdk = __canvasRuntime.sdkReact;
const __canvasRuntimeSdkContracts = __canvasRuntime.sdkContracts;
const __canvasRuntimeSdkPermissions = __canvasRuntime.sdkPermissions;
const t = __canvasRuntimeJsxRuntime.jsxs;
const i = __canvasRuntimeJsxRuntime.jsx;
const v = __canvasRuntimeReact.useRef;
const y = __canvasRuntimeReact.useEffect;
const u = __canvasRuntimeSdk.useSettings;
const x = __canvasRuntimeSdk.useViewport;
const b = __canvasRuntimeSdk.useSystem;
function B() {
  const l = u(), { width: w, height: h } = x(), e = b(), a = v(Date.now());
  y(() => {
    a.current = Date.now();
  }, [e]);
  const m = l.backgroundColor || "#1a1a2e", p = l.textColor || "#00ff88", r = l.accentColor || "#00ccff", f = l.transparency ?? 0.85, n = (o) => {
    if (o === 0) return "0 B";
    const d = 1024, g = ["B", "KB", "MB", "GB", "TB"], c = Math.floor(Math.log(o) / Math.log(d));
    return parseFloat((o / Math.pow(d, c)).toFixed(1)) + " " + g[c];
  }, s = (o) => n(o) + "/s";
  return /* @__PURE__ */ t(
    "div",
    {
      className: "system-monitor",
      style: {
        width: "100%",
        height: "100%",
        backgroundColor: m,
        opacity: f,
        color: p,
        fontFamily: '"Monaco", "Courier New", monospace',
        fontSize: `${Math.max(10, Math.min(14, h / 20))}px`,
        padding: "12px",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      },
      children: [
        /* @__PURE__ */ i(
          "div",
          {
            style: {
              fontSize: "1.2em",
              fontWeight: "bold",
              color: r,
              borderBottom: `1px solid ${r}`,
              paddingBottom: "6px",
              marginBottom: "4px"
            },
            children: "SYSTEM MONITOR"
          }
        ),
        /* @__PURE__ */ t(
          "div",
          {
            style: {
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            },
            children: [
              l.showCPU !== !1 && e.cpu && /* @__PURE__ */ t("div", { className: "metric", children: [
                /* @__PURE__ */ i("div", { style: { color: r, fontWeight: "bold" }, children: "CPU" }),
                /* @__PURE__ */ t("div", { children: [
                  "Cores: ",
                  e.cpu.cores
                ] }),
                /* @__PURE__ */ t("div", { children: [
                  "Usage: ",
                  e.cpu.usage.toFixed(1),
                  "%"
                ] }),
                /* @__PURE__ */ i(
                  "div",
                  {
                    style: {
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#333",
                      marginTop: "2px",
                      overflow: "hidden",
                      borderRadius: "2px"
                    },
                    children: /* @__PURE__ */ i(
                      "div",
                      {
                        style: {
                          height: "100%",
                          width: `${Math.min(100, e.cpu.usage)}%`,
                          backgroundColor: e.cpu.usage > 80 ? "#ff4444" : r,
                          transition: "width 0.3s ease"
                        }
                      }
                    )
                  }
                )
              ] }),
              l.showMemory !== !1 && e.memory && /* @__PURE__ */ t("div", { className: "metric", children: [
                /* @__PURE__ */ i("div", { style: { color: r, fontWeight: "bold" }, children: "MEMORY" }),
                /* @__PURE__ */ t("div", { children: [
                  "Used: ",
                  n(e.memory.used),
                  " /",
                  " ",
                  n(e.memory.total)
                ] }),
                /* @__PURE__ */ t("div", { children: [
                  "Free: ",
                  n(e.memory.free)
                ] }),
                /* @__PURE__ */ i(
                  "div",
                  {
                    style: {
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#333",
                      marginTop: "2px",
                      overflow: "hidden",
                      borderRadius: "2px"
                    },
                    children: /* @__PURE__ */ i(
                      "div",
                      {
                        style: {
                          height: "100%",
                          width: `${e.memory.used / e.memory.total * 100}%`,
                          backgroundColor: e.memory.used / e.memory.total * 100 > 80 ? "#ff4444" : r,
                          transition: "width 0.3s ease"
                        }
                      }
                    )
                  }
                )
              ] }),
              l.showBattery !== !1 && e.battery && /* @__PURE__ */ t("div", { className: "metric", children: [
                /* @__PURE__ */ i("div", { style: { color: r, fontWeight: "bold" }, children: "BATTERY" }),
                /* @__PURE__ */ t("div", { children: [
                  "Level: ",
                  (e.battery.level * 100).toFixed(0),
                  "%",
                  e.battery.charging && " ⚡ CHARGING"
                ] }),
                e.battery.health !== void 0 && /* @__PURE__ */ t("div", { children: [
                  "Health: ",
                  (e.battery.health * 100).toFixed(0),
                  "%"
                ] }),
                /* @__PURE__ */ i(
                  "div",
                  {
                    style: {
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#333",
                      marginTop: "2px",
                      overflow: "hidden",
                      borderRadius: "2px"
                    },
                    children: /* @__PURE__ */ i(
                      "div",
                      {
                        style: {
                          height: "100%",
                          width: `${e.battery.level * 100}%`,
                          backgroundColor: e.battery.level < 0.2 ? "#ff4444" : e.battery.level < 0.5 ? "#ffaa00" : r,
                          transition: "width 0.3s ease"
                        }
                      }
                    )
                  }
                )
              ] }),
              l.showDisk === !0 && e.disk && e.disk.length > 0 && /* @__PURE__ */ t("div", { className: "metric", children: [
                /* @__PURE__ */ i("div", { style: { color: r, fontWeight: "bold" }, children: "DISK" }),
                e.disk.map((o, d) => /* @__PURE__ */ t("div", { style: { fontSize: "0.9em", marginBottom: "4px" }, children: [
                  /* @__PURE__ */ i("div", { children: o.name }),
                  /* @__PURE__ */ t("div", { children: [
                    n(o.available),
                    " / ",
                    n(o.total),
                    " free"
                  ] }),
                  /* @__PURE__ */ i(
                    "div",
                    {
                      style: {
                        width: "100%",
                        height: "3px",
                        backgroundColor: "#333",
                        marginTop: "1px",
                        overflow: "hidden",
                        borderRadius: "1px"
                      },
                      children: /* @__PURE__ */ i(
                        "div",
                        {
                          style: {
                            height: "100%",
                            width: `${(o.total - o.available) / o.total * 100}%`,
                            backgroundColor: (o.total - o.available) / o.total * 100 > 80 ? "#ff4444" : r
                          }
                        }
                      )
                    }
                  )
                ] }, d))
              ] }),
              l.showNetwork === !0 && e.network && e.network.length > 0 && /* @__PURE__ */ t("div", { className: "metric", children: [
                /* @__PURE__ */ i("div", { style: { color: r, fontWeight: "bold" }, children: "NETWORK" }),
                e.network.map((o, d) => /* @__PURE__ */ t("div", { style: { fontSize: "0.9em", marginBottom: "4px" }, children: [
                  /* @__PURE__ */ i("div", { children: o.name }),
                  /* @__PURE__ */ t("div", { children: [
                    "↓ ",
                    s(o.received / 1e3)
                  ] }),
                  /* @__PURE__ */ t("div", { children: [
                    "↑ ",
                    s(o.transmitted / 1e3)
                  ] })
                ] }, d))
              ] }),
              !e.cpu && !e.memory && !e.battery && /* @__PURE__ */ t("div", { style: { color: "#ff6666", fontSize: "0.9em", marginTop: "8px" }, children: [
                "⚠ System data unavailable",
                /* @__PURE__ */ i("div", { style: { fontSize: "0.85em", marginTop: "4px", color: "#aaa" }, children: "Running in browser mode or desktop app not connected" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ t(
          "div",
          {
            style: {
              fontSize: "0.8em",
              color: "#666",
              borderTop: `1px solid ${r}33`,
              paddingTop: "4px",
              marginTop: "4px"
            },
            children: [
              "Updated: ",
              new Date(a.current).toLocaleTimeString()
            ]
          }
        )
      ]
    }
  );
}
export {
  B as default
};
