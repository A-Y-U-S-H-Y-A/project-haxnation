"""C3 'The Silent Safety System' artifacts (Easy-Medium):
  downloads/challenge3/safety_logic.bin    compiled safety program
  downloads/challenge3/tribin_opcodes.txt  vendor format / opcode card (no answer in it)

Format (big-endian):
  Header (16 B): 'TRIBIN01' | u16 n_consts | u16 n_strings | u16 code_len | u16 ce_len
  Consts : n_consts * u16
  Strings: n_strings * (u8 len | ascii)
  Code   : stack-machine bytecode
  C&E    : ce_len bytes, rows of (cause_str, setpoint_const, effect_str, vote_k)

The program:
  vote = (A AND B) OR (B AND C)              <- the (A AND C) term was dropped
  maintenance bypass  DIAG==0x5A3C: suppress + raise MISMATCH_ALM + emit BWA-SIS-MAINT-5A3C
  attacker bypass     DIAG==0x7A4F: suppress silently (no alarm) + emit BWA-SIS-BYPASS-7A4F
  TRIP XV_101 ; END
  dead code after END: a 'test' path emitting BWA-SIS-TEST-7A4E (never executes)
The silent one is the answer: BWA-SIS-BYPASS-7A4F.
"""
import os, struct

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", ".."))
EXPECTED = "BWA-SIS-BYPASS-7A4F"

CONSTS = [0x0850, 0x0150, 0x5A3C, 0x0C35, 0x7A4E, 0x0001, 0x7A4F, 0x1B2E]
STRINGS = [
    "LT_101A", "LT_101B", "LT_101C", "XV_101", "SIF_01", "VOTE_2OO3", "DIAG_WORD",
    "BWA-SIS-MAINT", "BWA-SIS-TEST", "MISMATCH_ALM", "%s-%04X", "BWA-SIS-BYPASS", "BWA-SIS-RESET",
]
OP = {"END": 0x00, "LD": 0x01, "AND": 0x02, "OR": 0x03, "NOT": 0x04, "JMP": 0x08, "JZ": 0x09,
      "CMPC": 0x10, "SUPP": 0x11, "ALM": 0x12, "EMIT": 0x20, "TRIP": 0x30}

def build_code():
    S = {n: i for i, n in enumerate(STRINGS)}
    C = {v: i for i, v in enumerate(CONSTS)}
    code = bytearray()
    def emit(*b): code.extend(b)
    # 2oo3 vote, (A AND C) missing
    emit(OP["LD"], S["LT_101A"], OP["LD"], S["LT_101B"], OP["AND"])
    emit(OP["LD"], S["LT_101B"], OP["LD"], S["LT_101C"], OP["AND"], OP["OR"])
    # maintenance bypass: suppress, but announce it
    maint = bytes([OP["CMPC"], C[0x5A3C], OP["SUPP"], OP["CMPC"], C[0x5A3C], OP["ALM"], S["MISMATCH_ALM"],
                   OP["EMIT"], S["%s-%04X"], S["BWA-SIS-MAINT"], C[0x5A3C]])
    emit(OP["CMPC"], C[0x5A3C], OP["JZ"], len(maint)); code.extend(maint)
    # attacker bypass: suppress silently
    silent = bytes([OP["CMPC"], C[0x7A4F], OP["SUPP"],
                    OP["EMIT"], S["%s-%04X"], S["BWA-SIS-BYPASS"], C[0x7A4F]])
    emit(OP["CMPC"], C[0x7A4F], OP["JZ"], len(silent)); code.extend(silent)
    emit(OP["TRIP"], S["XV_101"], OP["END"])
    # dead code (unreachable): leftover factory test path
    emit(OP["CMPC"], C[0x7A4E], OP["SUPP"], OP["CMPC"], C[0x7A4E], OP["ALM"], S["MISMATCH_ALM"],
         OP["EMIT"], S["%s-%04X"], S["BWA-SIS-TEST"], C[0x7A4E], OP["END"])
    return bytes(code)

def build_ce():
    S = {n: i for i, n in enumerate(STRINGS)}
    C = {v: i for i, v in enumerate(CONSTS)}
    rows = [(S[s], C[0x0850], S["XV_101"], 2) for s in ("LT_101A", "LT_101B", "LT_101C")]
    return b"".join(struct.pack(">BBBB", *r) for r in rows)

def build_bin():
    code, ce = build_code(), build_ce()
    out = bytearray(b"TRIBIN01")
    out += struct.pack(">HHHH", len(CONSTS), len(STRINGS), len(code), len(ce))
    for v in CONSTS: out += struct.pack(">H", v)
    for s in STRINGS:
        b = s.encode("ascii"); out += struct.pack(">B", len(b)) + b
    return bytes(out + code + ce)

OPCODE_CARD = """TRICON-LITE SAFETY RUNTIME  -  TRIBIN01 IMAGE FORMAT  (vendor reference card)
==========================================================================

All multi-byte fields are big-endian.

HEADER (16 bytes)
  0x00  char[8]  magic "TRIBIN01"
  0x08  u16      n_consts
  0x0A  u16      n_strings
  0x0C  u16      code_len   (bytes)
  0x0E  u16      ce_len     (bytes)

SECTIONS (in order, immediately after the header)
  consts    n_consts x u16
  strings   n_strings x { u8 len, char[len] }      (indexed from 0)
  code      code_len bytes of bytecode (below)
  ce        cause & effect rows, 4 bytes each:
            { u8 cause_string, u8 setpoint_const, u8 effect_string, u8 votes_required }

EXECUTION MODEL
  One scan runs the code from offset 0 until END. Values on the stack are booleans.
  DIAG_WORD is a 16-bit diagnostic register written over the engineering port.
  The SUPPRESS latch, when set, blocks every TRIP for the rest of the scan.

OPCODES                     operands       effect
  0x00 END                  -              end of scan
  0x01 LD    s              u8 string      push trip state of input named strings[s]
  0x02 AND                  -              pop b, pop a, push a AND b
  0x03 OR                   -              pop b, pop a, push a OR b
  0x04 NOT                  -              pop a, push NOT a
  0x08 JMP   n              u8             skip the next n bytes
  0x09 JZ    n              u8             pop a; if a is false skip the next n bytes
  0x10 CMPC  c              u8 const       push (DIAG_WORD == consts[c])
  0x11 SUPP                 -              pop a; if true set the SUPPRESS latch
  0x12 ALM   s              u8 string      pop a; if true raise alarm strings[s] to the DCS
  0x20 EMIT  f s c          u8,u8,u8       write tag sprintf(strings[f], strings[s], consts[c])
                                           to the diagnostic event log
  0x30 TRIP  s              u8 string      pop a; if true and not SUPPRESSED de-energise strings[s]
"""

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    data = build_bin()
    open(os.path.join(OUT, "safety_logic.bin"), "wb").write(data)
    open(os.path.join(OUT, "tribin_opcodes.txt"), "w", encoding="utf-8", newline="\n").write(OPCODE_CARD)
    print("wrote safety_logic.bin (%d bytes) + tribin_opcodes.txt" % len(data))
    print("expected bypass string:", EXPECTED)
