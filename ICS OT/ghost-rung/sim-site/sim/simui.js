// Shared DOM + style helpers for the Cascade Failure in-browser simulators.
// Everything here is presentation glue; the challenge logic lives in each sim module.

const CSS = `
.sim-wrap{display:grid;gap:12px}
.sim-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sim-panel{border:2px solid #0b0b0b;background:#0b0f10;color:#d7fbff;box-shadow:4px 4px 0 0 #0b0b0b}
.sim-panel>h4{margin:0;padding:6px 10px;font:800 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;background:#5ce1e6;color:#0b0b0b;border-bottom:2px solid #0b0b0b}
.sim-panel>.sim-body{padding:10px;font:400 12px/1.5 "JetBrains Mono",monospace}
.sim-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0}
.sim-btn{font:700 11px/1 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.08em;background:#5ce1e6;color:#0b0b0b;border:2px solid #0b0b0b;padding:7px 10px;cursor:pointer;box-shadow:2px 2px 0 0 #000}
.sim-btn:hover{transform:translate(1px,1px);box-shadow:1px 1px 0 0 #000}
.sim-btn.alt{background:#1a1f20;color:#5ce1e6}
.sim-btn.warn{background:#ff2a2a;color:#fff}
.sim-btn:disabled{opacity:.4;cursor:not-allowed}
.sim-led{display:inline-block;width:12px;height:12px;border:2px solid #0b0b0b;background:#333;vertical-align:middle}
.sim-led.on{background:#00e676;box-shadow:0 0 8px #00e676}
.sim-led.red{background:#ff2a2a;box-shadow:0 0 8px #ff2a2a}
.sim-led.amber{background:#ffeb3b;box-shadow:0 0 8px #ffeb3b}
.sim-kv{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #1f3a3d;padding:2px 0}
.sim-kv b{color:#5ce1e6;font-weight:700}
.sim-mono{font:400 12px/1.45 "JetBrains Mono",monospace;white-space:pre;overflow:auto;background:#06090a;border:1px solid #1f3a3d;padding:8px;color:#9fe}
.sim-ok{color:#00e676;font-weight:700}
.sim-bad{color:#ff6b6b;font-weight:700}
.sim-dim{color:#6aa7ab}
.sim-input{font:400 12px "JetBrains Mono",monospace;background:#06090a;color:#d7fbff;border:2px solid #0b0b0b;padding:6px 8px;width:9em}
.sim-canvas{display:block;width:100%;height:auto;background:#06090a;border:1px solid #1f3a3d}
.sim-flag{color:#ffeb3b}
.sim-term{background:#06090a;border:1px solid #1f3a3d;color:#9fe;padding:8px;height:180px;overflow:auto;font:400 12px/1.5 "JetBrains Mono",monospace;white-space:pre-wrap}
.sim-bar{height:14px;border:2px solid #0b0b0b;background:#06090a;position:relative;overflow:hidden}
.sim-bar>i{position:absolute;left:0;top:0;bottom:0;background:#5ce1e6;display:block}
`;

export function injectCSS() {
  if (document.getElementById("sim-shared-css")) return;
  const s = document.createElement("style");
  s.id = "sim-shared-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function h(tag, attrs = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

export function panel(title, bodyKids) {
  return h("div", { class: "sim-panel" }, [h("h4", { text: title }), h("div", { class: "sim-body" }, bodyKids)]);
}
export function led(on, kind = "on") { return h("span", { class: "sim-led" + (on ? " " + kind : "") }); }
export function kv(k, vEl) { return h("div", { class: "sim-kv" }, [h("span", { text: k }), typeof vEl === "string" ? h("b", { text: vEl }) : vEl]); }
