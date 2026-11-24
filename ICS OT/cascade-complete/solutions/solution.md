# Cascade Complete — Solution

- **Category:** ICS/OT · Attack Replay / Physical Covert Channel · **Difficulty:** Medium
- **Type:** browser simulator (`sim-site/`, live at
  <https://a-y-u-s-h-y-a.github.io/project-haxnation/sims/cascade-complete/>), real time,
  ~3 min per attempt
- **Answer:** the ASCII the pump taps out → `CASCADE-DONE`
- **Flag:** `HXN{CASCADE-DONE}` (case-insensitive; no banner, you decode and submit it yourself)
- **Needs:** the answers to The Leaky Hop, The Silent Safety System and Ghost Rung.

## Replay
```
connect --src 10.21.37.14                (The Leaky Hop)
sis inhibit 0x7A4F                       (The Silent Safety System)
implant arm gh0st:db99:9.20:p2off        (Ghost Rung; the exfil payload is sealed with all three)
regs                                     find the register map
modbus write 3 1                         freeze HMI-01 (otherwise operators stop the fill)
modbus write 1 0                         stop P-2
modbus write 0 500                       open FCV-101 fully
```
Things that reset the run: hitting HiHi with the SIS still voting, reaching 9.20 m with the HMI
live, or reaching it without the implant armed. `history` shows one forged row (pump ON while
the level rises at the full pump-off rate).

At 9.20 m the HMI locks with P-2 shown steady ON and the implant starts pulsing P-2
(~45 s). Then `log` prints every LT-101 sample and `export` downloads them as CSV.

## Decode
- 100 ms samples, 400 ms bits, so 2 samples per half-bit.
- Falling level = pump ON = low; rising = pump OFF = high.
- IEEE 802.3 Manchester: low→high = 1, high→low = 0.
- Preamble `10101010`, then 8-bit ASCII MSB-first, NUL-terminated → `CASCADE-DONE`.


## Real-world inspiration
- **Water-sector intrusions:** the 2021 **Oldsmar, Florida** incident (a remote session raised
  sodium hydroxide dosing on the HMI and an operator reverted it; the cause was later disputed)
  and the 2023 **CyberAv3ngers** campaign (attributed by CISA to an IRGC-affiliated group)
  against internet-exposed Unitronics PLCs at US water utilities, including Aliquippa, PA. Both
  show how directly an attacker with PLC/HMI access can change the physical process. This
  chapter chains what earlier chapters did: blind the operators (Stuxnet-style replay), defeat
  the SIS (TRITON-style), then drive the process.
- The idea comes from academic covert-channel research (for
  example the Ben-Gurion University air-gap work that leaks data through fan noise, power
  lines and heat).
- **What you learn:** a physical process is a communication channel. Any actuator an attacker
  controls can encode bits, and any sensor that records the process (here LT-101) can carry
  them out. Decoding takes signal-processing basics: sampling rate versus symbol rate,
  Manchester line coding, preambles for synchronisation. For defenders, oscillation in a
  process variable with a fixed period should get attention, not just be filed as "the pump
  hunting".
