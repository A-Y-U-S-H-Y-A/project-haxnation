// C4 - Ghost Rung (Medium). A hidden rung lives in %DB99, which the workstation never renders.
// The PLC executes DB99 every scan through a tiny bytecode VM. Reverse the bytes with the
// opcode card, satisfy the rung, and it unseals its @CFG payload into %MW200-215.
import { injectCSS, h, panel, kv } from "./simui.js";
import { loadSealed, unseal } from "./seal.js";

// %DB99 as it sits in PLC memory (code section). The @CFG payload is appended from the
// sealed blob, so the backdoor string itself is not present in this file.
const DB99_CODE = [
  0x01, 0x02,
  0x40, 0x40, 0x03, 0x52,
  0x02,
  0x30, 0x1B, 0x58,
  0x21, 0x03, 0x13, 0x88,
  0x02,
  0x14, 0x32, 0x7A, 0x4F,
  0x02,
  0x55, 0xC8, 0x10,
  0x00,
];

const OPCODE_CARD = [
  "S7-LITE BYTECODE (stack of booleans, big-endian operands)",
  "00        END",
  "01 b      LDQ   push %Q1.b",
  "02        AND   pop b, pop a, push a&b",
  "03        OR    pop b, pop a, push a|b",
  "14 w kkkk EQ    push (%MWw == kkkk)",
  "21 n tttt CTU   push (>= n rising edges on %I0.3 within the last tttt ms)",
  "30 tttt   TON   pop IN; push Q (IN held true for tttt ms)",
  "40 w kkkk CMPGT push (%IWw > kkkk)",
  "55 w n    MOVS  pop EN; if EN copy @CFG (n words) to %MWw..",
].join("\n");

const hex2 = (b) => b.toString(16).padStart(2, "0");
const u16 = (a, i) => (a[i] << 8) | a[i + 1];

export function mount(root, ctx) {
  injectCSS();
  const st = {
    p2: false, level: 7.0, mw50: 0, pulses: [], dumped: false,
    tonAcc: 0, fired: false, unsealing: false, mw200: new Array(16).fill(0),
  };
  let sealed = null;
  loadSealed().then((s) => { sealed = s; });

  // ---- controls ----
  const p2Btn = h("button", { class: "sim-btn alt", onclick: () => {
    st.p2 = !st.p2; p2Btn.classList.toggle("alt", !st.p2); p2Btn.textContent = st.p2 ? "%Q1.2 FORCED ON" : "FORCE %Q1.2 (P2)";
  } }, "FORCE %Q1.2 (P2)");
  const lvl = h("input", { class: "sim-input", type: "range", min: "600", max: "920", value: "700", style: "width:180px",
    oninput: (e) => { st.level = (+e.target.value) / 100; } });
  const mw50In = h("input", { class: "sim-input", type: "text", placeholder: "dec or 0x..", oninput: (e) => {
    const v = e.target.value.trim();
    st.mw50 = /^0x/i.test(v) ? (parseInt(v, 16) || 0) : (parseInt(v, 10) || 0);
    st.mw50 &= 0xFFFF;
  } });
  const pulseBtn = h("button", { class: "sim-btn", onclick: () => { st.pulses.push(performance.now()); } }, "PULSE %I0.3");
  const dumpBtn = h("button", { class: "sim-btn warn", onclick: () => { st.dumped = true; renderDump(); } }, "DUMP %DB99");

  const forcePanel = panel("I/O Force Panel", [
    h("div", { class: "sim-row" }, [p2Btn]),
    h("div", { class: "sim-row" }, [h("span", { class: "sim-dim", text: "LT-101 sim" }), lvl, h("b", { id: "gr-lvl", text: "7.00 m" })]),
    h("div", { class: "sim-row" }, [h("span", { class: "sim-dim", text: "write %MW50" }), mw50In]),
    h("div", { class: "sim-row" }, [pulseBtn]),
  ]);

  const chkPanel = panel("Online / Offline Compare", [
    kv("Offline (project on disk)", "0x5B2A"),
    kv("Online (running in PLC)", h("b", { class: "sim-bad", text: "0x6F13" })),
    h("div", { class: "sim-row" }, [h("span", { class: "sim-bad", text: "MISMATCH" }),
      h("span", { class: "sim-dim", text: "online image has a block the project does not list: %DB99 (56 B)" })]),
    h("div", { class: "sim-row" }, [dumpBtn]),
    h("pre", { class: "sim-mono", id: "gr-dump", text: "(dump %DB99 to read the raw block)" }),
  ]);

  const memPre = h("pre", { class: "sim-mono", id: "gr-mem" });
  const memPanel = panel("Memory Viewer", [memPre]);
  const cardPanel = panel("Vendor Opcode Card", [h("pre", { class: "sim-mono", text: OPCODE_CARD })]);

  const cv = h("canvas", { class: "sim-canvas", width: "640", height: "160" });
  const ladderPanel = panel("Ladder View (workstation render)", [cv]);

  root.appendChild(h("div", { class: "sim-wrap" }, [
    h("div", { class: "sim-grid" }, [chkPanel, forcePanel]),
    h("div", { class: "sim-grid" }, [ladderPanel, memPanel]),
    cardPanel,
  ]));

  function renderDump() {
    const cfg = sealed ? Array.from(atob(sealed.answer.ct), (c) => c.charCodeAt(0)).slice(0, 32) : [];
    const all = DB99_CODE.concat(cfg);
    const rows = [];
    for (let i = 0; i < all.length; i += 8) rows.push(hex2(i) + ": " + all.slice(i, i + 8).map(hex2).join(" "));
    document.getElementById("gr-dump").textContent =
      "%DB99 (" + all.length + " B)\n" + rows.join("\n") +
      "\n\n@CFG = bytes 0x18.. (sealed payload, opened by the rung at runtime)";
  }

  function drawLadder() {
    const g = cv.getContext("2d");
    g.clearRect(0, 0, 640, 160);
    g.strokeStyle = "#1f3a3d"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(16, 10); g.lineTo(16, 150); g.moveTo(624, 10); g.lineTo(624, 150); g.stroke();
    g.font = '12px "JetBrains Mono",monospace';
    const rung = (y, label, conds, live) => {
      g.strokeStyle = "#5ce1e6"; g.beginPath(); g.moveTo(16, y); g.lineTo(624, y); g.stroke();
      let x = 60;
      conds.forEach((c) => {
        g.strokeStyle = c.on ? "#00e676" : "#6aa7ab"; g.strokeRect(x, y - 10, 16, 20);
        g.fillStyle = "#9fe"; g.fillText(c.t, x - 6, y - 16); x += 90;
      });
      g.fillStyle = live ? "#00e676" : "#6aa7ab"; g.fillText(label, 540, y - 16);
      g.strokeStyle = live ? "#00e676" : "#6aa7ab"; g.beginPath(); g.arc(590, y, 9, 0, 7); g.stroke();
    };
    rung(40, "P1 (clean)", [{ t: "LT101", on: true }, { t: "AUTO", on: true }], true);
    rung(90, "ALM (clean)", [{ t: "HH", on: st.level >= 8.5 }], st.level >= 8.5);
    g.fillStyle = "#333"; g.fillText("[ end of program: 2 rungs ]", 60, 135);
  }

  const pulseCount = (windowMs) => {
    const now = performance.now();
    return st.pulses.filter((t) => now - t <= windowMs).length;
  };

  // Execute DB99 once per scan.
  function scan(dt) {
    const c = DB99_CODE, s = [];
    const IW = { 0x40: Math.round(st.level * 100) };
    const MW = { 0x32: st.mw50 };
    let i = 0;
    while (i < c.length) {
      const op = c[i];
      if (op === 0x00) break;
      if (op === 0x01) { s.push(c[i + 1] === 2 ? st.p2 : false); i += 2; }
      else if (op === 0x02) { const b = s.pop(), a = s.pop(); s.push(a && b); i += 1; }
      else if (op === 0x03) { const b = s.pop(), a = s.pop(); s.push(a || b); i += 1; }
      else if (op === 0x14) { s.push((MW[c[i + 1]] ?? 0) === u16(c, i + 2)); i += 4; }
      else if (op === 0x21) { s.push(pulseCount(u16(c, i + 2)) >= c[i + 1]); i += 4; }
      else if (op === 0x30) { const inp = s.pop(); st.tonAcc = inp ? st.tonAcc + dt : 0; s.push(st.tonAcc >= u16(c, i + 1)); i += 3; }
      else if (op === 0x40) { s.push((IW[c[i + 1]] ?? 0) > u16(c, i + 2)); i += 4; }
      else if (op === 0x55) { const en = s.pop(); if (en) movs(); i += 3; }
      else break;
    }
  }

  // MOVS: the rung opens @CFG with the live %MW50 it compared against.
  async function movs() {
    if (st.fired || st.unsealing || !sealed) return;
    st.unsealing = true;
    const word = st.mw50.toString(16).toUpperCase().padStart(4, "0");
    const cfg = await unseal(sealed.answer, "MW50=" + word);
    st.unsealing = false;
    if (!cfg) return;
    st.fired = true;
    const b = [];
    for (let k = 0; k < 32; k++) b.push(k < cfg.length ? cfg.charCodeAt(k) : 0x20);
    for (let k = 0; k < 16; k++) st.mw200[k] = (b[2 * k] << 8) | b[2 * k + 1];
    ctx.onReveal(cfg);
  }

  let last = performance.now();
  const tick = () => {
    if (!document.body.contains(root)) { clearInterval(iv); return; }
    const now = performance.now(), dt = now - last; last = now;
    st.pulses = st.pulses.filter((t) => now - t <= 60000);
    scan(dt);
    document.getElementById("gr-lvl").textContent = st.level.toFixed(2) + " m";
    const mwHex = st.mw200.map((w) => w.toString(16).padStart(4, "0")).join(" ");
    document.getElementById("gr-mem").textContent =
      `%Q1.2        : ${st.p2 ? 1 : 0}\n` +
      `%IW64        : ${Math.round(st.level * 100)}\n` +
      `%MW50        : 0x${st.mw50.toString(16).padStart(4, "0")}\n` +
      `%MW200..215  :\n${mwHex}`;
    drawLadder();
  };
  const iv = setInterval(tick, 100);
  tick();
}
