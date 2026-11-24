# The Impossible Levels — Solution

- **Category:** ICS/OT · Process Forensics / Mass Balance · **Difficulty:** Easy-Medium
- **Artifacts:** `tank_data.txt`, `pump_curves.pdf`
- **Answer:** true peak deviation, metres, 2 dp → `3.47`
- **Flag:** `HXN{3.47}`

## The trick
At 01:51:20 the HMI freezes on its last good value (5.002 m) and stays frozen for 21 rows. In
that window the pump is logged **stopped** on most rows, yet a non-zero outflow (close to the
inflow) is logged so the columns look balanced. The datasheet says the pump is fixed speed
(0.280 m³/s) with a check valve: a stopped pump moves **no** water, and its discharge is not
metered at all, so the logged outflow is a calculated value the attacker controlled.
When the HMI finally unfreezes, the level has already drained well below its crest, so no
row ever displays the peak.

## Solve
- A = π·(4.00/2)² = 12.566 m²; Δt = 10 s.
- True outflow = 0.280 if `pump_status = 1`, else 0. Use the logged **inflow** (metered).
- Flows are averages over the interval that starts at each timestamp:
  `h[i+1] = h[i] + (Qin[i] − Qout_true[i]) · 10 / A`, starting from the first row.
- `max |h_true − hmi_level|` = 3.4731 m → **3.47**. (Applying each row's flows to the interval
  that *ends* at it instead gives 3.4668, which also rounds to 3.47.)

Traps: integrating the logged outflow gives about 3.27, and reading the post-unfreeze jump gives
about 2.41.

Reference solver: `python solutions/resources/solve_c2.py` (generator: `generate_c2.py`,
which uses `minipdf.py` to build the datasheet).

## Real-world inspiration
- **Stuxnet** (2010, against the Natanz enrichment plant) recorded about **21 seconds** of normal
  sensor readings and replayed them to the operators and safety logic while it overspun the
  centrifuges. The 21-row HMI freeze in this challenge is a nod to it. The operators saw a calm
  plant while the physical process was being driven out of bounds.
- **What you learn:** HMI and historian values are data an attacker can forge. Physics can't
  be forged: mass balance, equipment datasheets (a stopped pump with a check valve moves no
  water) and which signals are *measured* versus *calculated* let you rebuild the truth from
  first principles. Independent, hard-wired measurements are a real defensive control for
  this reason.
