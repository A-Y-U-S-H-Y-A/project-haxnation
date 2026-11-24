"""Reference solver for C2: integrate the true level from tank_data.txt with the pump curve
(0.280 m^3/s running, 0 stopped) instead of the logged outflow, and report the peak
deviation between true and displayed level. Flows apply to the interval starting at each row.
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = os.path.normpath(os.path.join(HERE, "..", "..", "tank_data.txt"))
A = math.pi * 2.0 ** 2          # D = 4.00 m from the datasheet
PUMP = 0.280

def load():
    rows = []
    for line in open(TXT, encoding="utf-8"):
        if not line[:1].isdigit(): continue
        ts, qin, qout, pump, hmi = line.strip().split(",")
        rows.append((ts, float(qin), float(qout), int(pump), float(hmi)))
    return rows

def solve(rows, forward=True):
    h = rows[0][4]; peak = (0.0, rows[0][0])
    for i in range(len(rows)):
        if i:
            src = rows[i - 1] if forward else rows[i]
            h += (src[1] - (PUMP if src[3] else 0.0)) * 10 / A
        dev = abs(h - rows[i][4])
        if dev > peak[0]: peak = (dev, rows[i][0])
    return peak

if __name__ == "__main__":
    rows = load()
    dev, at = solve(rows)
    print("peak deviation %.4f m at %s -> %.2f" % (dev, at, dev))
    print("(sanity) trusting the logged outflow instead gives %.4f" %
          max(abs(sum((r[1] - r[2]) * 10 / A for r in rows[1:i]) + rows[0][4] - rows[i][4]) for i in range(1, len(rows))))
    print("(sanity) backward-interval convention gives %.4f" % solve(rows, forward=False)[0])
    sys.exit(0 if "%.2f" % dev == "3.47" else 1)
