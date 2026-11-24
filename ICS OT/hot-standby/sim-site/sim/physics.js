// Shared water-tank physics, ported from the original physics_model.py.
// A = 12.5664 m^2 cylinder; mass balance dh = (Qin - Qout)*dt / A. Levels in metres.
export class WaterTank {
  constructor(opts = {}) {
    this.area = opts.area ?? 12.5664;
    this.level = opts.level ?? 5.0;        // m
    this.inflow = opts.inflow ?? 0.0;      // m^3/s
    this.outflow = opts.outflow ?? 0.0;    // m^3/s
    this.hiHi = opts.hiHi ?? 8.5;          // m
    this.min = 0.0; this.max = opts.max ?? 10.0;
  }
  // Advance by dt seconds. Returns the new level.
  step(dt) {
    const dh = ((this.inflow - this.outflow) * dt) / this.area;
    this.level = Math.max(this.min, Math.min(this.max, this.level + dh));
    return this.level;
  }
  // Level (m) -> 4..20 mA transmitter current for a 0..10 m span.
  toMilliamps() { return 4 + (this.level / this.max) * 16; }
}
