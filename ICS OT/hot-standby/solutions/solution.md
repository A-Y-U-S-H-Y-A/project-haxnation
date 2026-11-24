# Hot Standby — Solution

- **Category:** ICS/OT · Redundancy / Data-Block Forensics / Live Response · **Difficulty:** Insane
- **Type:** browser simulator (`sim-site/`, live at
  <https://a-y-u-s-h-y-a.github.io/project-haxnation/sims/hot-standby/>)
- **Answer:** the recovery token → `standby_clean_1sync`
- **Flag:** `HXN{standby_clean_1sync}` (the page shows it after a 60 s stable hold)

## The trick
`%DB10` holds eight IEEE-754 REALs, shown only as raw 16-bit words plus the CPU's (big-endian)
reading. The attacker corrupted them in **different** ways, and the correct block is never in
the page. The token is sealed with the 16 correct words, so the only way to get it is to work
out every value.

| DBD | tag | design basis | correct | shipped | what happened |
|---|---|---|---|---|---|
| 0 | HiHi | 85 % of 10 m = 8.50 | `4108 0000` | `0000 4108` | word swap (CDAB) |
| 4 | Pump start | 65 % = 6.50 | `40D0 0000` | `D040 0000` | byte swap (BADC) |
| 8 | Pump stop | 20 % = 2.00 | `4000 0000` | `0000 0040` | full reverse (DCBA) |
| 12 | Max fill | FCV rating 0.500 | `3F00 0000` | `0000 3F00` | word swap (CDAB) |
| 16 | LoLo | 15 % = 1.50 | `3FC0 0000` | same | clean |
| 20 | Area | π·2² = 12.566371 | `4149 0FDB` | same | clean (looks odd, it's float32 π·4) |
| 24 | Setpoint | 50 % = 5.00 | `40A0 0000` | `40F9 999A` (7.80) | plausible but wrong value |
| 28 | Deadband | 0.20 | `3E4C CCCD` | `4C3E CDCC` | byte swap (BADC) |

## The live part
- Sync runs automatically every 15 s. It can't be paused or forced.
- In the scan before the first sync that would carry your edits, the implant re-writes DBD0
  with the poisoned value (the event log shows `DB10.DBW0 written (src 192.168.20.9, PUT job)`).
  That sync copies the poison to the standby.
- Re-fix DBD0, wait for the **next** sync, check the standby column matches, then press
  **Complete Failover**. A wrong block runs away to a 9.50 m SIS trip (then **Retry**).
- With a clean block the standby rides out an inflow surge and holds for 60 s, then the token
  is released.


## Real-world inspiration
- **No specific APT** is known for this exact technique, so here is what the challenge teaches.
- **Byte and word order are a real-world mess.** Modbus registers are 16-bit, and a 32-bit REAL
  spans two of them. Vendors disagree on word order (ABCD vs CDAB, the "word-swapped float"
  setting in almost every SCADA driver), and byte-swapped variants exist too. A value that is
  corrupted only by ordering usually still decodes to *some* number. Spotting it means decoding
  all four orders and choosing the one that matches the design basis (percentages of tank
  height, valve ratings, π·r²). Values that look odd but are legitimate (12.566371) and
  plausible values that are wrong (7.80 m setpoint) are the hard cases.
- **Redundancy is not recovery.** Hot-standby pairs sync configuration and data blocks so the
  standby can take over seamlessly, which also means they faithfully replicate whatever the
  attacker writes. An implant that is still live will re-poison your fix right before the sync.
  Real incident response has to remove the persistence first (or isolate its write path: here,
  the PUT job from the DMZ proxy), confirm that the standby's copy is clean, and only then fail
  over. The same holds for backups and golden images: restore from what you have verified.
