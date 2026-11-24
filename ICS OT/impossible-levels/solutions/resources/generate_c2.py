"""C2 'The Impossible Levels' artifacts (Easy-Medium).
Emits downloads/challenge2/tank_data.txt and pump_curves.pdf.

Physics: vertical cylinder A = pi*2^2 = 12.5664 m^2, 10 s samples. Flows in a row are the
average over the 10 s interval that STARTS at that timestamp, so
    h[i+1] = h[i] + (Qin[i] - Qout_true[i]) * 10 / A
Qout_true is the pump curve: 0.280 m^3/s when pump_status = 1, 0 when stopped.

Attack: the HMI freezes on its last good value. During the window the pump is mostly logged
STOPPED, yet a fabricated outflow (~= inflow) is logged so the column balances. The FCV
inflow modulates row to row, and the pump briefly runs twice. After the attack the pump runs,
inflow drops and the level drains; the HMI stays frozen a while longer and only unfreezes
once the level is well below the crest, so no row ever displays the peak.
The inflow series is tuned so peak_dev = max(h_true - h_hmi) = 3.47 m.
"""
import math, os, random
from datetime import datetime, timedelta
from minipdf import write_pdf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", ".."))
A = math.pi * 2.0 ** 2
DT = 10.0
PUMP = 0.280
START = datetime(2024, 10, 14, 1, 48, 0)
TARGET = 3.47

def qout_true(pump): return PUMP if pump == 1 else 0.0

def plan(scale, tweak=0.0):
    """Return rows as dicts (inflow rounded to 3 dp, as logged)."""
    rng = random.Random(0xC2)
    rows = []
    # Phase 1: 20 trustworthy rows, pump running, FCV hunting gently around the pump rate.
    for _ in range(20):
        rows.append({"qin": round(PUMP + rng.uniform(-0.012, 0.012), 3), "pump": 1, "phase": 1})
    # Phase 2: 14-row attack. Pump logged stopped except two short runs.
    pump_on = {5, 9}
    for k in range(14):
        base = 0.30 + 0.16 * math.sin(k / 13 * math.pi) + rng.uniform(-0.03, 0.03)
        q = base * scale + (tweak if k == 13 else 0.0)
        rows.append({"qin": round(min(0.500, max(0.0, q)), 3), "pump": 1 if k in pump_on else 0, "phase": 2})
    # Phase 3: recovery - pump runs, inflow cut back, level drains. HMI frozen 7 more rows.
    for k in range(16):
        rows.append({"qin": round(0.090 + rng.uniform(-0.01, 0.01), 3), "pump": 1, "phase": 3 if k < 7 else 4})
    # Integrate the truth and build the HMI column.
    h = 5.000
    frozen = None
    for i, r in enumerate(rows):
        r["true"] = h
        if r["phase"] == 1:
            r["hmi"] = round(h, 3)
        elif r["phase"] in (2, 3):
            if frozen is None: frozen = rows[i - 1]["hmi"]
            r["hmi"] = frozen
        else:
            r["hmi"] = round(h, 3)
        r["qout_log"] = round(PUMP if r["pump"] else max(0.0, r["qin"] + rng.uniform(-0.004, 0.004)), 3)
        h = h + (r["qin"] - qout_true(r["pump"])) * DT / A
    return rows

def peak_dev(rows):
    """What a correct solver computes from the logged file alone."""
    h = rows[0]["hmi"]; peak = 0.0
    for i, r in enumerate(rows):
        if i:
            p = rows[i - 1]
            h = h + (p["qin"] - qout_true(p["pump"])) * DT / A
        peak = max(peak, abs(h - r["hmi"]))
    return peak

def peak_dev_backward(rows):
    """Same, but a solver who applies each row's flows to the interval ENDING at it."""
    h = rows[0]["hmi"]; peak = 0.0
    for i, r in enumerate(rows):
        if i:
            h = h + (r["qin"] - qout_true(r["pump"])) * DT / A
        peak = max(peak, abs(h - r["hmi"]))
    return peak

def tuned():
    """Both integration conventions must round to TARGET (aim their midpoint at it)."""
    mid_of = lambda rows: (peak_dev(rows) + peak_dev_backward(rows)) / 2
    lo, hi = 0.5, 2.0
    for _ in range(60):
        mid = (lo + hi) / 2
        (lo, hi) = (mid, hi) if mid_of(plan(mid)) < TARGET else (lo, mid)
    best = None
    for t in [x / 1000 for x in range(-40, 41)]:
        rows = plan(lo, t); d = abs(mid_of(rows) - TARGET)
        if best is None or d < best[0]: best = (d, rows)
    rows = best[1]
    for f in (peak_dev, peak_dev_backward):
        assert "%.2f" % f(rows) == "%.2f" % TARGET, (f.__name__, f(rows))
    return rows

def write_txt(rows):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "tank_data.txt")
    t = START
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("# BLACKWOOD REGIONAL WATER AUTHORITY - HISTORIAN EXPORT (T-101)\n")
        f.write("# Sample interval 10 s. Flow columns are averages over the interval starting at the timestamp.\n")
        f.write("# inflow_m3s: FCV-101 flow meter. outflow_m3s: P-101 discharge as logged by the PLC.\n")
        f.write("# hmi_level_m: level as displayed on HMI-01.\n")
        f.write("timestamp,inflow_m3s,outflow_m3s,pump_status,hmi_level_m\n")
        for r in rows:
            f.write("%s,%.3f,%.3f,%d,%.3f\n" % (t.strftime("%Y-%m-%d %H:%M:%S"), r["qin"], r["qout_log"], r["pump"], r["hmi"]))
            t += timedelta(seconds=int(DT))
    return path

def write_pdf_doc():
    lines = [
        "BLACKWOOD REGIONAL WATER AUTHORITY - EQUIPMENT DATASHEET",
        "DOC REF: BRWA-EQ-DS-P101-REV3   SYSTEM: Transfer Pump P-101 / Tank T-101",
        "",
        "1. TANK T-101",
        "   Vertical cylinder, internal diameter 4.00 m, straight side 10.0 m.",
        "   High-High (HiHi) trip level 8.50 m. Overflow weir 9.60 m.",
        "",
        "2. PUMP P-101 (fixed speed, discharge to clearwell)",
        "   Duty point: 0.280 m^3/s at 18 m TDH (tolerance +/- 0.005 m^3/s).",
        "   Check valve CV-101 on discharge: no reverse or residual flow when stopped.",
        "",
        "3. INLET FCV-101",
        "   Modulating, 0.000 .. 0.500 m^3/s. Magnetic flow meter FT-101, +/- 0.5 %.",
        "",
        "4. INSTRUMENTATION NOTES",
        "   LT-101 level transmitter feeds the PLC; HMI-01 displays the PLC tag.",
        "   P-101 discharge flow is not metered; the PLC logs a calculated value.",
    ]
    path = os.path.join(OUT, "pump_curves.pdf")
    write_pdf(path, "P-101 Datasheet", lines)
    return path

if __name__ == "__main__":
    rows = tuned()
    print("wrote", write_txt(rows))
    print("wrote", write_pdf_doc())
    true_peak = max(r["true"] for r in rows)
    print("true crest %.3f m, max displayed %.3f m" % (true_peak, max(r["hmi"] for r in rows)))
    print("computed peak_dev = %.4f -> %.2f" % (peak_dev(rows), peak_dev(rows)))
