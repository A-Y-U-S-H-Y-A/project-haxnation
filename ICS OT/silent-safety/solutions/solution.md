# The Silent Safety System — Solution

- **Category:** ICS/OT · Safety Instrumented Systems (SIS) / Bytecode RE · **Difficulty:** Easy-Medium
- **Artifacts:** `safety_logic.bin`, `tribin_opcodes.txt`
- **Answer:** the silent bypass tag → `BWA-SIS-BYPASS-7A4F`
- **Flag:** `HXN{BWA-SIS-BYPASS-7A4F}` (case-insensitive)

## The trick
`strings` shows four tag prefixes (`MAINT`, `TEST`, `BYPASS`, `RESET`), a `%s-%04X` format
string, and eight 16-bit constants, including the near-miss `0x7A4E`. Guessing doesn't work.
You have to disassemble the image with the vendor opcode card.

## Disassembly
```
0000 LD LT_101A ; LD LT_101B ; AND
0005 LD LT_101B ; LD LT_101C ; AND ; OR        vote = (A·B)+(B·C)   (A·C dropped)
000B CMPC 0x5A3C ; JZ +11
000F   CMPC 0x5A3C ; SUPP                       maintenance bypass: suppress ...
0012   CMPC 0x5A3C ; ALM MISMATCH_ALM           ... and announce it to the DCS
0016   EMIT "%s-%04X" BWA-SIS-MAINT 0x5A3C
001A CMPC 0x7A4F ; JZ +7
001E   CMPC 0x7A4F ; SUPP                       attacker bypass: suppress, NO alarm
0021   EMIT "%s-%04X" BWA-SIS-BYPASS 0x7A4F
0025 TRIP XV_101 ; END
0028 (dead code after END) ... EMIT BWA-SIS-TEST-7A4E
```
The challenge text says the system "did it quietly, with no alarm". The only reachable bypass
that suppresses without `ALM` is the `0x7A4F` path, whose tag is `BWA-SIS-BYPASS-7A4F`.
The `MAINT` path raises an alarm, and the `TEST` path never runs.

Note the vote too: the 2-out-of-3 logic has been reduced to `(A·B)+(B·C)`, so transmitter B
alone can block a trip. Keep the `0x7A4F` diagnostic word in mind for later chapters.

Reference solver: `python solutions/resources/solve_c3.py` (generator: `generate_c3.py`).

## Real-world inspiration
- **TRITON / TRISIS** (attributed to **XENOTIME / TEMP.Veles**, linked to a Russian state
  research institute) reprogrammed **Schneider Electric Triconex** safety controllers at a Saudi
  petrochemical facility in 2017. It is the first known malware built to disable a safety
  instrumented system, whose only job is to prevent explosions and loss of life. It was found
  only because a bug in the implant tripped the plant. The "TRICON-LITE / TRIBIN" format here is
  a simplified homage to that platform.
- **What you learn:** safety logic is code and can be backdoored like any other code. Audit
  SIS programs against a known-good baseline. Look for bypasses that suppress a trip without
  annunciating it, voting logic that has been weakened, and decoy or dead code. Verify reachability
  instead of trusting `strings`. Keep SIS key switches in RUN and segment the SIS from the
  control network.
