"""Reference solver for C3, written from tribin_opcodes.txt only: parse safety_logic.bin,
disassemble it, rebuild the vote expression, and find the reachable bypass that suppresses
the SIF without raising an alarm. Its EMIT tag is the answer.
"""
import os, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BIN = os.path.normpath(os.path.join(HERE, "..", "..", "safety_logic.bin"))
NAMES = {0x00: "END", 0x01: "LD", 0x02: "AND", 0x03: "OR", 0x04: "NOT", 0x08: "JMP", 0x09: "JZ",
         0x10: "CMPC", 0x11: "SUPP", 0x12: "ALM", 0x20: "EMIT", 0x30: "TRIP"}
NOPS = {0x01: 1, 0x08: 1, 0x09: 1, 0x10: 1, 0x12: 1, 0x20: 3, 0x30: 1}

def parse(path):
    d = open(path, "rb").read()
    assert d[:8] == b"TRIBIN01"
    nc, ns, cl, el = struct.unpack_from(">HHHH", d, 8); off = 16
    consts = list(struct.unpack_from(">%dH" % nc, d, off)); off += 2 * nc
    strings = []
    for _ in range(ns):
        n = d[off]; strings.append(d[off + 1: off + 1 + n].decode()); off += 1 + n
    return consts, strings, d[off: off + cl]

def disasm(consts, strings, code):
    i, out = 0, []
    while i < len(code):
        op = code[i]; args = list(code[i + 1: i + 1 + NOPS.get(op, 0)])
        out.append((i, NAMES.get(op, "??%02X" % op), args)); i += 1 + NOPS.get(op, 0)
    return out

def analyse(consts, strings, code):
    ins = disasm(consts, strings, code)
    end = next(o for o, n, _ in ins if n == "END")
    stack, blocks, cur = [], [], None
    for off, name, a in ins:
        txt = {"LD": lambda: strings[a[0]], "CMPC": lambda: "DIAG==0x%04X" % consts[a[0]],
               "EMIT": lambda: strings[a[0]] % (strings[a[1]], consts[a[2]]),
               "ALM": lambda: strings[a[0]], "TRIP": lambda: strings[a[0]], "JZ": lambda: "+%d" % a[0]}.get(name, lambda: "")()
        print("%s %04X  %-5s %s" % ("   " if off <= end else "(d)", off, name, txt))
        if off > end: continue
        if name == "LD": stack.append(strings[a[0]])
        elif name in ("AND", "OR"):
            b, x = stack.pop(), stack.pop(); stack.append("(%s %s %s)" % (x, name, b))
        elif name == "JZ":
            cur = {"guard": stack.pop(), "until": off + 2 + a[0], "supp": False, "alm": False, "tag": None}; blocks.append(cur)
        elif name == "CMPC": stack.append("DIAG==0x%04X" % consts[a[0]])
        elif name == "SUPP": stack.pop(); cur and cur.update(supp=True)
        elif name == "ALM": stack.pop(); cur and cur.update(alm=True)
        elif name == "EMIT": cur and cur.update(tag=txt)
        elif name == "TRIP": print("      vote driving TRIP:", stack.pop())
    return blocks

if __name__ == "__main__":
    consts, strings, code = parse(BIN)
    blocks = analyse(consts, strings, code)
    silent = [b for b in blocks if b["supp"] and not b["alm"]]
    for b in blocks:
        print("bypass if %-14s suppress=%s alarm=%s tag=%s" % (b["guard"], b["supp"], b["alm"], b["tag"]))
    answer = silent[0]["tag"] if len(silent) == 1 else None
    print("SILENT BYPASS STRING:", answer)
    sys.exit(0 if answer == "BWA-SIS-BYPASS-7A4F" else 1)
