# Ghost Rung — Solution

- **Category:** ICS/OT · Ladder Logic RE / Hidden Logic · **Difficulty:** Medium
- **Type:** browser simulator
- **Answer:** the config the hidden rung writes into `%MW200–215` → `gh0st:db99:9.20:p2off`
- **Flag:** `HXN{gh0st:db99:9.20:p2off}` (the page shows it once the rung fires)

## The trick
The workstation draws two clean rungs, but the online/offline compare shows an extra 56-byte
block, `%DB99`, that the project doesn't list. Dump it and decode the first 24 bytes with the
opcode card:

```
01 02          LDQ   %Q1.2              P2 output
40 40 03 52    CMPGT %IW64 > 850        level > 8.50 m
02             AND
30 1B 58       TON   7000 ms            held for 7 s
21 03 13 88    CTU   3 edges / 5000 ms  three %I0.3 pulses within 5 s
02             AND
14 32 7A 4F    EQ    %MW50 == 0x7A4F    the diagnostic word from The Silent Safety System
02             AND
55 C8 10       MOVS  %MW200, 16 words   copy @CFG
00             END
```
Bytes 0x18 onward are the sealed `@CFG` payload. The rung opens it with the live `%MW50`
value, so it only unseals when the word is correct.

## Solve
Force P2 on, move the level above 8.50 m, write `0x7A4F` (or 31311) to `%MW50`, and keep all
of that held. Fire three `%I0.3` pulses inside the same 5 s window **after** the 7 s timer has
had time to run (the timer and counter must both be true in the same scan). `%MW200–215` then
fills with ASCII words (big-endian pairs): `gh0st:db99:9.20:p2off`.


## Real-world inspiration
- **Stuxnet** infected the Siemens **Step 7** engineering software (it replaced
  `s7otbxdx.dll`) and became the first known PLC rootkit. It injected its own organisation and
  data blocks into S7-300/400 PLCs and filtered the engineering workstation's reads, so engineers
  looking at the project saw clean logic while the controller ran the attack code. This
  challenge's "two clean rungs plus an unlisted `%DB99`" is the same idea in miniature.
- **What you learn:** the project on the workstation is a claim about the PLC, not the PLC.
  Online/offline block compares, block checksums, unexpected data blocks, and logic that only
  fires under an unusual combination of conditions (a timer, a pulse counter and a magic word
  together) are the signs of an implant. Trigger-gated logic is also why "it passed testing" is
  not evidence of a clean controller.
