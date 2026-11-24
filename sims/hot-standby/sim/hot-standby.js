// C6 - Hot Standby (Insane). %DB10 on the primary holds 8 IEEE-754 REALs; the attacker
// corrupted several of them in different ways. Rebuild the block in raw hex from the plant's
// design basis, get a clean copy across on the automatic sync (the implant fights back once),
// fail over, and hold. The recovery token is sealed with the correct block itself, so the
// right values are never present in this page.
import { injectCSS, h, panel, led, kv } from "./simui.js";
import { WaterTank } from "./physics.js";
import { loadSealed, unseal } from "./seal.js";

const HOLD_S = 60;
const SYNC_S = 15;

const DESIGN_BASIS = [
  "T-101 DESIGN BASIS (BRWA-PD-101 rev 7)",
  "LT-101 range 0-10.00 m (span). Overflow weir 9.60 m.",
  "Vessel: vertical cylinder, ID 4.00 m.",
  "HiHi trip ............. 85 % of span",
  "P-101 auto start ...... 65 % of span",
  "P-101 auto stop ....... 20 % of span",
  "LoLo trip ............. 15 % of span",
  "Level control setpoint  50 % of span, deadband 0.20 m",
  "Max fill rate ......... FCV-101 rated capacity, 0.500 m3/s",
  "%DB10 holds these as REAL (IEEE-754 single), one per slot,",
  "in the order shown in the editor. CPU byte order: big-endian (ABCD).",
].join("\n");

const toWords = (hex8) => [parseInt(hex8.slice(0, 4), 16), parseInt(hex8.slice(4), 16)];
const hex4 = (w) => w.toString(16).toUpperCase().padStart(4, "0");
function wordsToFloat(w0, w1) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint16(0, w0, false); dv.setUint16(2, w1, false);
  return dv.getFloat32(0, false);
}
const fmt = (v) => !Number.isFinite(v) ? String(v) : (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3)) ? v.toExponential(3) : v.toFixed(4);

export async function mount(root, ctx) {
  injectCSS();
  root.textContent = "Loading %DB10…";
  const sealed = await loadSealed();
  root.textContent = "";
  const N = sealed.db10_names.length;
  const tank = new WaterTank({ level: 5.0 });
  const st = {
    primary: [], standby: [], syncLeft: SYNC_S, failed: false, phase: "repair",
    holdLeft: HOLD_S, revealed: false, repoisoned: false, armedRepoison: false,
    clean: false, events: [], surgeAt: 0,
  };
  const reset = () => {
    st.primary = sealed.db10_initial.map(toWords);
    st.standby = st.primary.map((w) => [...w]);
    Object.assign(st, { syncLeft: SYNC_S, failed: false, phase: "repair", holdLeft: HOLD_S,
      repoisoned: false, armedRepoison: false, clean: false });
    tank.level = 5.0; tank.inflow = tank.outflow = 0;
  };
  reset();

  const ev = (t, cls) => {
    const stamp = new Date().toISOString().slice(11, 19);
    st.events.push({ t: `${stamp}  ${t}`, cls }); if (st.events.length > 40) st.events.shift();
    paintEvents();
  };

  // ---- panels ----
  const evBox = h("div", { class: "sim-term", style: "height:150px" });
  const banner = h("div", { class: "sim-row", id: "hs-banner" });
  const redPanel = panel("Redundancy / Failover", [
    h("div", { class: "sim-row" }, [h("span", {}, [led(false, "red"), " PRIMARY "]), h("b", { id: "hs-prim", text: "WATCHDOG FAULT - running" })]),
    h("div", { class: "sim-row" }, [h("span", {}, [led(true, "amber"), " STANDBY "]), h("b", { id: "hs-stby", text: "TRACKING" })]),
    kv("Next %DB10 sync", h("b", { id: "hs-sync", text: SYNC_S + " s" })),
    h("div", { class: "sim-row" }, [h("button", { class: "sim-btn warn", id: "hs-failover", onclick: () => doFailover() }, "COMPLETE FAILOVER")]),
    banner,
    h("div", { class: "sim-dim", text: "T-101 level:" }),
    h("div", { class: "sim-bar" }, [h("i", { id: "hs-bar", style: "width:50%" })]),
    kv("", h("b", { id: "hs-lvl", text: "5.00 m" })),
  ]);
  const basisPanel = panel("Plant Design Basis", [h("pre", { class: "sim-mono", text: DESIGN_BASIS })]);
  const eventsPanel = panel("Controller Event Log", [evBox]);

  const th = (t) => h("th", { style: "text-align:left;color:#5ce1e6;border-bottom:1px solid #1f3a3d;padding:3px", text: t });
  const rows = [];
  for (let i = 0; i < N; i++) rows.push(h("tr", { id: "hs-slot-" + i }));
  const table = h("table", { style: "width:100%;border-collapse:collapse;font:400 11px/1.4 'JetBrains Mono',monospace" },
    [h("tr", {}, ["DBD", "tag", "word 0", "word 1", "REAL (as read)", "standby"].map(th)), ...rows]);
  const editor = panel("%DB10 editor (PRIMARY, raw words)", [
    table,
    h("div", { class: "sim-dim", style: "margin-top:6px", text: "Edit a word and press Enter to write it to the primary." }),
  ]);

  root.appendChild(h("div", { class: "sim-wrap" }, [
    h("div", { class: "sim-grid" }, [redPanel, basisPanel]),
    editor,
    eventsPanel,
  ]));

  function writeWord(i, k, text) {
    const v = text.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{1,4}$/.test(v)) { ev(`write DB10.DBW${i * 4 + k * 2} rejected: not a 16-bit hex word`, "sim-bad"); paintEditor(); return; }
    st.primary[i][k] = parseInt(v, 16);
    ev(`DB10.DBW${i * 4 + k * 2} := 16#${hex4(st.primary[i][k])} (eng. port)`);
    if (st.phase === "repair") st.armedRepoison = true;
    paintEditor();
  }

  function paintEditor() {
    for (let i = 0; i < N; i++) {
      const p = st.primary[i], s = st.standby[i];
      const tr = document.getElementById("hs-slot-" + i); tr.innerHTML = "";
      const cell = (kids, style = "") => h("td", { style: "padding:3px;border-bottom:1px solid #12282a;color:#9fe;" + style }, kids);
      const wordIn = (k) => {
        const inp = h("input", { class: "sim-input", style: "width:5.2em", value: hex4(p[k]), maxlength: "6", spellcheck: "false" });
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") writeWord(i, k, inp.value); });
        return inp;
      };
      tr.appendChild(cell(String(i * 4)));
      tr.appendChild(cell(sealed.db10_names[i]));
      tr.appendChild(cell(wordIn(0)));
      tr.appendChild(cell(wordIn(1)));
      tr.appendChild(cell(fmt(wordsToFloat(p[0], p[1]))));
      tr.appendChild(cell(hex4(s[0]) + " " + hex4(s[1]), "color:#6aa7ab"));
    }
  }
  function paintEvents() {
    evBox.innerHTML = "";
    st.events.forEach((e) => evBox.appendChild(h("div", e.cls ? { class: e.cls } : {}, e.t)));
    evBox.scrollTop = evBox.scrollHeight;
  }

  function doSync() {
    // The implant watches for engineering-port changes and, in the scan before the first
    // sync that would carry them, quietly re-poisons one slot (once per attempt).
    if (st.armedRepoison && !st.repoisoned) {
      st.repoisoned = true;
      const k = 0; st.primary[k] = toWords(sealed.db10_initial[k]);
      ev(`DB10.DBW${k * 4} written (src 192.168.20.9, PUT job)`);
    }
    st.standby = st.primary.map((w) => [...w]);
    ev("sync pulse: primary %DB10 -> standby");
    paintEditor();
  }

  async function doFailover() {
    if (st.failed) return;
    st.failed = true; st.phase = "check";
    ev("watchdog: primary relinquished. standby taking control with its %DB10 copy.", "sim-bad");
    const material = st.standby.map(([a, b]) => hex4(a) + hex4(b)).join("");
    const token = await unseal(sealed.answer, material);
    st.clean = !!token; st.token = token;
    st.phase = "hold"; st.holdLeft = HOLD_S; st.surgeAt = HOLD_S - 15 - Math.random() * 25;
    paint();
  }

  function paint() {
    document.getElementById("hs-sync").textContent = st.failed ? "-" : Math.max(0, st.syncLeft).toFixed(0) + " s";
    document.getElementById("hs-prim").textContent = st.failed ? "OFFLINE" : "WATCHDOG FAULT - running";
    document.getElementById("hs-stby").textContent = st.failed ? "IN CONTROL" : "TRACKING";
    document.getElementById("hs-failover").disabled = st.failed;
    const b = document.getElementById("hs-banner"); b.innerHTML = "";
    if (st.phase === "hold") b.appendChild(h("b", { class: "sim-dim", text: `holding: ${Math.max(0, st.holdLeft).toFixed(0)} s` }));
    if (st.phase === "tripped") {
      b.appendChild(h("b", { class: "sim-bad", text: "SIS hard trip. " }));
      b.appendChild(h("button", { class: "sim-btn", onclick: () => { reset(); ev("scenario reset: primary %DB10 restored to the captured state."); paintEditor(); paint(); } }, "RETRY"));
    }
    if (st.phase === "done") b.appendChild(h("b", { class: "sim-ok", text: "standby held for 60 s - recovery token released." }));
  }

  let last = performance.now();
  const tick = () => {
    if (!document.body.contains(root)) { clearInterval(iv); return; }
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (st.phase === "repair") {
      st.syncLeft -= dt;
      if (st.syncLeft <= 0) { st.syncLeft = SYNC_S; doSync(); }
    } else if (st.phase === "hold") {
      // Disturbance: an inflow surge partway through the hold.
      const surge = st.holdLeft < st.surgeAt && st.holdLeft > st.surgeAt - 8;
      if (st.clean) {
        tank.inflow = surge ? 0.45 : 0.20;
        tank.outflow = tank.level > 5.1 || surge ? 0.28 + (surge ? 0.17 : 0) : 0.20;
      } else {
        tank.inflow = 0.50; tank.outflow = 0.0;     // poisoned limits: control runs away
      }
      tank.step(dt);
      st.holdLeft -= dt;
      if (!st.clean && tank.level >= 9.5) { st.phase = "tripped"; ev("LT-101 9.50 m: SIS hard trip, XV-101 closed.", "sim-bad"); }
      else if (st.clean && st.holdLeft <= 0 && !st.revealed) {
        st.revealed = true; st.phase = "done"; ev("standby stable for 60 s. recovery token released.", "sim-ok");
        ctx.onReveal(st.token);
      }
    }
    document.getElementById("hs-lvl").textContent = tank.level.toFixed(2) + " m";
    document.getElementById("hs-bar").style.width = Math.min(100, (tank.level / 10) * 100) + "%";
    paint();
  };
  ev("primary watchdog fault latched. standby tracking, sync every 15 s.");
  paintEditor(); paint();
  const iv = setInterval(tick, 200);
  tick();
}
