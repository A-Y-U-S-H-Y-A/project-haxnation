// C5 - Cascade Complete (Medium). Replay the attack against an in-browser plant, then recover
// the implant's Manchester-encoded exfil from the raw 4-20 mA level log while the HMI lies.
// The message is sealed: the implant can only build it from the three earlier answers.
import { injectCSS, h, panel, led, kv } from "./simui.js";
import { WaterTank } from "./physics.js";
import { loadSealed, unseal } from "./seal.js";

const C1_IP_HASH = "ed019053c00f241db13210770ebb713102f3812a7558af1285082a92f7851248";
const C4_CFG_HASH = "fac1be3011d7d66b1b0c3a3059b55b2f71345fd31de41f9007887db206b91a7d";
const C3_WORD = 0x7A4F;
const PREAMBLE = [1, 0, 1, 0, 1, 0, 1, 0];
const BIT_MS = 400;                  // one Manchester bit
const SAMPLE_MS = 100;               // 4-20 mA logger sample period
const SAMPLES_PER_HALF = (BIT_MS / 2) / SAMPLE_MS;
const PEAK = 9.20;
const HIHI = 8.50;

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function msgToBits(msg) {
  const bits = [...PREAMBLE];
  for (const ch of msg) for (let i = 7; i >= 0; i--) bits.push((ch.charCodeAt(0) >> i) & 1);
  for (let i = 0; i < 8; i++) bits.push(0);   // NUL terminator
  return bits;
}
// IEEE 802.3 Manchester: 1 = low->high, 0 = high->low. Pump ON pulls the level down (low).
function bitsToHalfStates(bits) {
  const halves = [];
  for (const b of bits) { halves.push(b ? 1 : 0); halves.push(b ? 0 : 1); }
  return halves; // 1 => pump ON (level falling) for this half-bit
}

export function mount(root, ctx) {
  injectCSS();
  const tank = new WaterTank({ level: 5.0 });
  const st = {
    phase: "idle", ip: "", connected: false, sisOff: false, armed: false, cfg: "", message: null,
    hr: [280, 1, 850, 0],              // HR0 FCV setpoint (L/s), HR1 P-2 run, HR2 HiHi (cm), HR3 HMI freeze
    hmiLevel: 5.0, hmiP2: true, halves: [], txTick: 0, samples: [], txDone: false,
  };
  let sealed = null;
  loadSealed().then((s) => { sealed = s; });

  const term = h("div", { class: "sim-term", id: "cc-term" });
  const line = (t, cls) => { term.appendChild(h("div", cls ? { class: cls } : {}, t)); term.scrollTop = term.scrollHeight; };
  const input = h("input", { class: "sim-input", style: "width:100%", placeholder: "type 'help' and press Enter", spellcheck: "false", autocomplete: "off" });

  const hmiLvl = h("b", { id: "cc-hmilvl", text: "5.00 m" });
  const trueLvl = h("b", { id: "cc-truelvl", text: "5.00 m" });
  const p2led = led(true);
  const statusEl = h("b", { id: "cc-status", text: "NOMINAL" });
  const bar = h("div", { class: "sim-bar" }, [h("i", { id: "cc-bar", style: "width:0%" })]);
  const hmi = panel("HMI-01 (operator view)", [
    kv("Displayed level", hmiLvl),
    kv("Pump P-2", h("span", {}, [p2led, h("span", { id: "cc-p2txt", text: " ON" })])),
    kv("Status", statusEl),
    h("div", { class: "sim-dim", text: "LT-101 raw (forensic tap):" }), bar, kv("", trueLvl),
  ]);
  const consolePanel = panel("Recovered Attacker Console", [term, h("div", { class: "sim-row" }, [input])]);
  root.appendChild(h("div", { class: "sim-wrap" }, [h("div", { class: "sim-grid" }, [hmi, consolePanel])]));

  line("blackwood implant shell v0.9  (sandbox replay)");
  line("type 'help'", "sim-dim");

  const HELP = [
    "connect --src <ip>        open the session from the original source address",
    "sis inhibit <word>        write the SIS diagnostic word",
    "implant arm <config>      load the implant's backdoor config",
    "regs                      show the PLC holding-register map",
    "modbus write <reg> <val>  write a holding register",
    "history                   historian rows from the original night",
    "status                    session state",
    "log                       print the captured LT-101 transmitter samples",
    "export                    download the captured samples as CSV",
  ];

  async function handle(raw) {
    const cmd = raw.trim(); if (!cmd) return;
    line("$ " + cmd);
    const a = cmd.split(/\s+/);
    if (a[0] === "help") { HELP.forEach((l) => line(l)); return; }
    if (a[0] === "status") {
      line(`connected=${st.connected} sis_inhibited=${st.sisOff} implant=${st.armed ? "armed" : "idle"} phase=${st.phase}`);
      return;
    }
    if (a[0] === "connect") {
      const i = a.indexOf("--src"); const ip = (i >= 0 ? a[i + 1] : "") || "";
      if ((await sha256hex(ip.trim())) === C1_IP_HASH) { st.connected = true; st.ip = ip.trim(); line("session open, source " + ip, "sim-ok"); }
      else line("refused: PLC-01 ACL does not know that source", "sim-bad");
      return;
    }
    if (a[0] === "sis" && a[1] === "inhibit") {
      if (!st.connected) return line("refused: no session", "sim-bad");
      const w = (a[2] || "").toLowerCase().replace(/^0x/, "");
      if (/^[0-9a-f]{1,4}$/.test(w) && parseInt(w, 16) === C3_WORD) { st.sisOff = true; line("SIF_01 suppressed (no mismatch alarm raised)", "sim-ok"); }
      else line("SIS: diagnostic word ignored", "sim-bad");
      return;
    }
    if (a[0] === "implant" && a[1] === "arm") {
      if (!st.sisOff) return line("refused: SIS still voting", "sim-bad");
      const cfg = a.slice(2).join(" ").trim();
      if ((await sha256hex(cfg)) !== C4_CFG_HASH) return line("refused: config rejected by %DB99", "sim-bad");
      if (!sealed) return line("implant: not ready, try again", "sim-bad");
      st.message = await unseal(sealed.answer, `${st.ip}|7A4F|${cfg}`);
      if (!st.message) return line("refused: config rejected by %DB99", "sim-bad");
      st.armed = true; line("implant armed. exfil payload staged.", "sim-ok");
      return;
    }
    if (a[0] === "regs") {
      line("HR0  FCV-101 inlet setpoint   L/s   0..500   (now " + st.hr[0] + ")");
      line("HR1  P-2 run command          0/1            (now " + st.hr[1] + ")");
      line("HR2  HiHi trip level          cm    r/o      (now " + st.hr[2] + ")");
      line("HR3  HMI-01 display freeze    0/1            (now " + st.hr[3] + ")");
      return;
    }
    if (a[0] === "modbus" && a[1] === "write") {
      if (!st.connected) return line("refused: no session", "sim-bad");
      const reg = +a[2], val = +a[3];
      if (![0, 1, 2, 3].includes(reg) || !Number.isFinite(val)) return line("exception 02: illegal data address", "sim-bad");
      if (reg === 2) return line("exception 04: HR2 is read-only", "sim-bad");
      if (reg === 0) st.hr[0] = Math.max(0, Math.min(500, Math.round(val)));
      else st.hr[reg] = val ? 1 : 0;
      line(`HR${reg} = ${st.hr[reg]}`, "sim-ok");
      if (st.phase === "idle" || st.phase === "tripped") st.phase = "running";
      return;
    }
    if (a[0] === "history") {
      line("t(s)  pump  inflow  dLevel/10s");
      line(" 00    ON   0.280   +0.000");
      line(" 10    ON   0.280   +0.000");
      line(" 20    OFF  0.500   +0.398");
      line(" 30    ON   0.500   +0.398   <-- pump logged ON, level still rising at full rate", "sim-bad");
      line(" 40    OFF  0.500   +0.398");
      line("note: one of these rows was written by the implant, not the plant.", "sim-dim");
      return;
    }
    if (a[0] === "log") {
      if (!st.samples.length) return line("no samples captured yet", "sim-bad");
      line(`${st.samples.length} samples @ ${SAMPLE_MS} ms   t_ms, mA, level_m`);
      st.samples.forEach((s) => line(`${String(s.t).padStart(6)}  ${s.mA.toFixed(4)}  ${s.level.toFixed(4)}`));
      return;
    }
    if (a[0] === "export") {
      if (!st.samples.length) return line("no samples captured yet", "sim-bad");
      const csv = "t_ms,mA,level_m\n" + st.samples.map((s) => `${s.t},${s.mA.toFixed(4)},${s.level.toFixed(4)}`).join("\n") + "\n";
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = h("a", { href: url, download: "lt101_capture.csv" }); document.body.appendChild(link); link.click(); link.remove();
      line(`exported ${st.samples.length} samples -> lt101_capture.csv`, "sim-ok");
      return;
    }
    line("unknown command: " + a[0], "sim-bad");
  }
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const v = input.value; input.value = ""; handle(v); } });

  const startTx = () => {
    st.phase = "transmit";
    st.halves = bitsToHalfStates(msgToBits(st.message));
    st.txTick = 0; st.samples = [];
    tank.level = 5.0;
    line("!! HMI-01 LOCKED. P-2 lamp held steady ON. implant transmitting...", "sim-bad");
  };

  let last = performance.now();
  const tick = () => {
    if (!document.body.contains(root)) { clearInterval(iv); return; }
    const now = performance.now(), dt = (now - last) / 1000; last = now;

    if (st.phase === "running") {
      tank.inflow = st.hr[0] / 1000; tank.outflow = st.hr[1] ? 0.28 : 0.0;
      tank.step(dt);
      st.hmiLevel = st.hr[3] ? st.hmiLevel : tank.level;
      st.hmiP2 = st.hr[3] ? st.hmiP2 : !!st.hr[1];
      if (tank.level >= HIHI && !st.sisOff) {
        st.phase = "tripped"; st.hr = [0, 1, 850, 0]; tank.level = 5.0; st.hmiLevel = 5.0; st.hmiP2 = true;
        line("SIS TRIP: XV-101 closed at HiHi. plant reset to 5.00 m.", "sim-bad");
      } else if (tank.level >= PEAK) {
        if (st.armed && st.hr[3]) startTx();
        else {
          const frozen = !!st.hr[3];
          st.phase = "tripped"; st.hr = [0, 1, 850, 0]; tank.level = 5.0; st.hmiLevel = 5.0; st.hmiP2 = true;
          line(frozen ? "overfill alarm from the weir sensor (implant not armed). plant reset." :
            "operators saw the level on HMI-01 and stopped the inflow. plant reset.", "sim-bad");
        }
      }
    } else if (st.phase === "transmit") {
      const halfIdx = Math.floor(st.txTick / SAMPLES_PER_HALF);
      if (halfIdx >= st.halves.length) {
        st.phase = "txdone"; st.txDone = true; tank.inflow = tank.outflow = 0;
        line("transmission ended. capture ready ('log' / 'export').", "sim-ok");
      } else {
        const on = st.halves[halfIdx] === 1;
        tank.inflow = on ? 0.10 : 0.50; tank.outflow = on ? 0.50 : 0.10;
        tank.step(SAMPLE_MS / 1000);
        st.samples.push({ t: st.txTick * SAMPLE_MS, level: tank.level, mA: tank.toMilliamps() });
        st.txTick++;
      }
    }

    document.getElementById("cc-hmilvl").textContent = st.hmiLevel.toFixed(2) + " m";
    document.getElementById("cc-truelvl").textContent = tank.level.toFixed(2) + " m";
    document.getElementById("cc-bar").style.width = Math.min(100, (tank.level / 10) * 100) + "%";
    const locked = st.phase === "transmit" || st.phase === "txdone";
    p2led.className = "sim-led" + (locked || st.hmiP2 ? " on" : "");
    document.getElementById("cc-p2txt").textContent = locked ? " ON (steady)" : (st.hmiP2 ? " ON" : " OFF");
    document.getElementById("cc-status").textContent =
      st.phase === "transmit" ? "NOMINAL" : st.phase === "txdone" ? "NOMINAL" : st.hr[3] ? "NOMINAL" : "LIVE";
    document.getElementById("cc-status").className = "sim-ok";
  };
  const iv = setInterval(tick, SAMPLE_MS);
  tick();
}
