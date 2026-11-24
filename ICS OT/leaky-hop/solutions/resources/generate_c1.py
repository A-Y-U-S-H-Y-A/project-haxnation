"""C1 'The Leaky Hop' artifact: downloads/challenge1/edge_span_0200.pcapng (~2 min of traffic)

Attribution story:
  * The malicious sessions to PLC-01 come from the DMZ proxy 192.168.20.9 -> naive attribution.
  * Background: HMI polling, historian polls (which re-resolve plc01), an engineering
    workstation that resolves plc01 and opens its own legit OPC UA session, NTP, and two
    decoy hosts on the attacker's 10.21.37.0/24 subnet doing legitimate historian traffic.
  * ~300 ms before the proxy session, the REAL attacker 10.21.37.14 leaks a direct DNS A
    query for plc01.blackwood.local (proxychains without proxy_dns).
  * The OPC UA CreateSession ApplicationUri embeds urn:10.21.37.14:... -> corroboration.
  * The first Modbus FC16 (Write Multiple Registers) is the intrusion time = epoch.

Everything is hand-assembled Ethernet/IPv4/(TCP|UDP) in a minimal pcapng (linktype 1).
"""
import os, struct

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", ".."))

# Identities
ATTACKER = "10.21.37.14"      # real attacker (leaked via DNS + OPC UA URI)
PROXY    = "192.168.20.9"     # open DMZ proxy (what every session appears to be)
PLC      = "192.168.10.101"   # plc01.blackwood.local
PLC2     = "192.168.10.102"   # plc02.blackwood.local
DNSSRV   = "192.168.10.2"
NTPSRV   = "192.168.10.3"
HMI      = "192.168.10.15"
HMI2     = "192.168.10.16"
ENGWS    = "192.168.10.30"    # legitimate engineering workstation
HIST     = "192.168.10.40"    # historian
VENDOR   = "10.21.37.40"      # decoy: legit vendor jump host on the attacker's subnet
VPNUSER  = "10.21.37.22"      # decoy: remote operator (reads the historian only)
GW_MAC   = bytes.fromhex("020000000001")
EPOCH    = 1728872254         # first malicious FC16 write (2024-10-14 02:17:34 UTC)
T0       = EPOCH - 95         # capture start

class _Macs(dict):
    """Locally administered MAC derived from the IP (02:00:a:b:c:d)."""
    def __missing__(self, ip):
        a, b, c, d = (int(x) for x in ip.split("."))
        return bytes([0x02, 0x00, a, b, c, d])
MACS = _Macs()

def ip4(s): return bytes(int(x) for x in s.split("."))

def cksum(data):
    if len(data) % 2: data += b"\x00"
    s = sum(struct.unpack(">%dH" % (len(data) // 2), data))
    s = (s >> 16) + (s & 0xFFFF); s += (s >> 16)
    return (~s) & 0xFFFF

def ipv4(src, dst, proto, payload, ident=0):
    total = 20 + len(payload)
    hdr = struct.pack(">BBHHHBBH4s4s", 0x45, 0, total, ident, 0x4000, 64, proto, 0, ip4(src), ip4(dst))
    chk = cksum(hdr)
    hdr = hdr[:10] + struct.pack(">H", chk) + hdr[12:]
    return hdr + payload

def l4_cksum(src, dst, proto, seg):
    pseudo = ip4(src) + ip4(dst) + struct.pack(">BBH", 0, proto, len(seg))
    return cksum(pseudo + seg)

def udp(src, dst, sport, dport, payload):
    seg = struct.pack(">HHHH", sport, dport, 8 + len(payload), 0) + payload
    c = l4_cksum(src, dst, 17, seg) or 0xFFFF
    seg = seg[:6] + struct.pack(">H", c) + seg[8:]
    return ipv4(src, dst, 17, seg)

def tcp(src, dst, sport, dport, seq, ack, flags, payload=b""):
    off = (5 << 4)
    seg = struct.pack(">HHIIBBHHH", sport, dport, seq, ack, off, flags, 8192, 0, 0) + payload
    c = l4_cksum(src, dst, 6, seg)
    seg = seg[:16] + struct.pack(">H", c) + seg[18:]
    return ipv4(src, dst, 6, seg)

def eth(src_ip, dst_ip, ipframe, to_gw=True):
    dst = GW_MAC if to_gw else MACS[dst_ip]
    return MACS[src_ip] + dst + struct.pack(">H", 0x0800) + ipframe

# ---- DNS ----
def dns_name(name):
    out = b""
    for lab in name.split("."):
        out += struct.pack(">B", len(lab)) + lab.encode()
    return out + b"\x00"

def dns_query(name, tid):
    h = struct.pack(">HHHHHH", tid, 0x0100, 1, 0, 0, 0)
    return h + dns_name(name) + struct.pack(">HH", 1, 1)

def dns_response(name, tid, ip):
    h = struct.pack(">HHHHHH", tid, 0x8180, 1, 1, 0, 0)
    q = dns_name(name) + struct.pack(">HH", 1, 1)
    ans = struct.pack(">HHHIH", 0xC00C, 1, 1, 300, 4) + ip4(ip)
    return h + q + ans

# ---- Modbus ----
def modbus(tid, unit, pdu):
    return struct.pack(">HHHB", tid, 0, len(pdu) + 1, unit) + pdu

def modbus_fc3(tid, start, qty):
    return modbus(tid, 1, struct.pack(">BHH", 3, start, qty))

def modbus_fc3_resp(tid, regs):
    pdu = struct.pack(">BB", 3, len(regs) * 2) + b"".join(struct.pack(">H", r) for r in regs)
    return modbus(tid, 1, pdu)

def modbus_fc16(tid, start, regs):
    data = b"".join(struct.pack(">H", r) for r in regs)
    pdu = struct.pack(">BHHB", 16, start, len(regs), len(data)) + data
    return modbus(tid, 1, pdu)

# ---- OPC UA (simplified; ApplicationUri string is greppable) ----
def opcua_create_session(app_uri):
    uri = app_uri.encode()
    # OPC UA SecureConversation 'MSGF' chunk, then a CreateSessionRequest-ish body.
    body = b"CreateSessionRequest\x00"
    body += struct.pack("<i", len(uri)) + uri                 # ApplicationUri (OPC UA String)
    body += struct.pack("<i", len(b"BlackwoodEngStation")) + b"BlackwoodEngStation"  # ApplicationName
    body += struct.pack("<i", -1)                              # null product uri
    header = b"MSGF" + struct.pack("<I", 8 + 8 + len(body)) + struct.pack("<I", 0) + struct.pack("<I", 1)
    return header + body

# ---- build capture ----
import random
RNG = random.Random(0xB1AC)
HOSTS = {"plc01.blackwood.local": PLC, "plc02.blackwood.local": PLC2,
         "historian.blackwood.local": HIST, "ntp.blackwood.local": NTPSRV,
         "update.blackwood.local": "192.168.10.50"}

class Cap:
    def __init__(self): self.pkts = []
    def add(self, t, frame): self.pkts.append((t, frame))

def is_local(ip): return ip.startswith("192.168.10.")
def frame(src, dst, ipf):
    return eth(src, dst, ipf, to_gw=not (is_local(src) and is_local(dst)))

def lookup(cap, t, client, name, sport=None):
    tid = RNG.randrange(1, 0xFFFF); sport = sport or RNG.randrange(49152, 65535)
    cap.add(t, frame(client, DNSSRV, udp(client, DNSSRV, sport, 53, dns_query(name, tid))))
    cap.add(t + RNG.uniform(0.003, 0.009),
            frame(DNSSRV, client, udp(DNSSRV, client, 53, sport, dns_response(name, tid, HOSTS[name]))))

class Tcp:
    """One TCP session with sequence tracking."""
    def __init__(self, cap, cli, srv, sport, dport):
        self.cap, self.cli, self.srv, self.sp, self.dp = cap, cli, srv, sport, dport
        self.cs, self.ss = RNG.randrange(1, 2**31), RNG.randrange(1, 2**31)
    def open(self, t):
        c, s = self.cli, self.srv
        self.cap.add(t, frame(c, s, tcp(c, s, self.sp, self.dp, self.cs, 0, 0x02)))
        self.cap.add(t + 0.0012, frame(s, c, tcp(s, c, self.dp, self.sp, self.ss, self.cs + 1, 0x12)))
        self.cs += 1; self.ss += 1
        self.cap.add(t + 0.0018, frame(c, s, tcp(c, s, self.sp, self.dp, self.cs, self.ss, 0x10)))
        return t + 0.002
    def c2s(self, t, data):
        c, s = self.cli, self.srv
        self.cap.add(t, frame(c, s, tcp(c, s, self.sp, self.dp, self.cs, self.ss, 0x18, data))); self.cs += len(data)
    def s2c(self, t, data):
        c, s = self.cli, self.srv
        self.cap.add(t, frame(s, c, tcp(s, c, self.dp, self.sp, self.ss, self.cs, 0x18, data))); self.ss += len(data)
    def close(self, t):
        c, s = self.cli, self.srv
        self.cap.add(t, frame(c, s, tcp(c, s, self.sp, self.dp, self.cs, self.ss, 0x11)))
        self.cap.add(t + 0.001, frame(s, c, tcp(s, c, self.dp, self.sp, self.ss, self.cs + 1, 0x11)))

def rnd(n): return bytes(RNG.randrange(256) for _ in range(n))

def ntp_pair(cap, t, client):
    cap.add(t, frame(client, NTPSRV, udp(client, NTPSRV, 123, 123, bytes([0x23]) + bytes(47))))
    cap.add(t + 0.002, frame(NTPSRV, client, udp(NTPSRV, client, 123, 123, bytes([0x24, 2, 6, 0xE9]) + rnd(44))))

def level_regs():
    return [512 + RNG.randrange(-3, 4), 280, 280, 210, 1, 0, 0, 0, 0, 0]

def build():
    cap = Cap()
    END = EPOCH + 25

    # HMI-01 / HMI-02 resolve their PLCs, then poll on persistent sessions.
    lookup(cap, T0 + 0.4, HMI, "plc01.blackwood.local")
    lookup(cap, T0 + 0.9, HMI2, "plc02.blackwood.local")
    h1 = Tcp(cap, HMI, PLC, 51000, 502); t = h1.open(T0 + 0.5); tid = 1
    while t < END:
        h1.c2s(t, modbus_fc3(tid, 0, 10)); h1.s2c(t + 0.004, modbus_fc3_resp(tid, level_regs()))
        tid += 1; t += 1.0 + RNG.uniform(-0.02, 0.02)
    h2 = Tcp(cap, HMI2, PLC2, 51200, 502); t = h2.open(T0 + 1.0); tid = 1
    while t < END:
        h2.c2s(t, modbus_fc3(tid, 40, 4)); h2.s2c(t + 0.005, modbus_fc3_resp(tid, [330, 0, 1, 77]))
        tid += 1; t += 2.0 + RNG.uniform(-0.03, 0.03)

    # Historian polls PLC-01 every 5 s on short connections, re-resolving plc01 each time.
    t = T0 + 3.0; tid = 1
    while t < END:
        lookup(cap, t, HIST, "plc01.blackwood.local")
        s = Tcp(cap, HIST, PLC, RNG.randrange(40000, 48000), 502); u = s.open(t + 0.02)
        s.c2s(u, modbus_fc3(tid, 0, 10)); s.s2c(u + 0.004, modbus_fc3_resp(tid, level_regs())); s.close(u + 0.01)
        tid += 1; t += 5.0 + RNG.uniform(-0.1, 0.1)

    # Engineering workstation: resolves plc01 and opens its own legitimate OPC UA session.
    for t0 in (T0 + 22.0, EPOCH - 41.0):
        lookup(cap, t0, ENGWS, "plc01.blackwood.local")
        s = Tcp(cap, ENGWS, PLC, RNG.randrange(50000, 60000), 4840); u = s.open(t0 + 0.04)
        s.c2s(u, opcua_create_session("urn:%s:BlackwoodEngStation:client" % ENGWS))
        s.s2c(u + 0.003, b"MSGF" + struct.pack("<I", 24) + bytes(16)); s.close(u + 2.5)

    # Decoy hosts on the attacker's 10.21.37.0/24 subnet doing legitimate things.
    for t0 in (T0 + 12.0, T0 + 48.0, EPOCH + 9.0):
        lookup(cap, t0, VENDOR, "historian.blackwood.local")
        s = Tcp(cap, VENDOR, HIST, RNG.randrange(50000, 60000), 443); u = s.open(t0 + 0.05)
        s.c2s(u, bytes([0x16, 3, 1]) + rnd(90)); s.s2c(u + 0.01, bytes([0x16, 3, 3]) + rnd(120)); s.close(u + 0.4)
    lookup(cap, T0 + 31.0, VENDOR, "update.blackwood.local")
    lookup(cap, T0 + 61.0, VPNUSER, "historian.blackwood.local")
    s = Tcp(cap, VPNUSER, HIST, 55123, 443); u = s.open(T0 + 61.05)
    for k in range(6):
        s.c2s(u + k * 1.5, bytes([0x17, 3, 3]) + rnd(60)); s.s2c(u + k * 1.5 + 0.02, bytes([0x17, 3, 3]) + rnd(300))
    s.close(u + 10)

    # NTP chatter.
    for k, host in enumerate((HMI, HMI2, ENGWS, HIST)):
        t = T0 + 5 + 7 * k
        while t < END:
            ntp_pair(cap, t, host); t += 32.0

    # *** THE LEAK: the real attacker resolves plc01 itself (proxychains without proxy_dns)
    # ~300 ms before the proxied session, and never connects to the PLC directly. ***
    lookup(cap, EPOCH - 0.300, ATTACKER, "plc01.blackwood.local", sport=54044)

    # Proxied OPC UA session: every packet shows the proxy, but the ApplicationUri leaks.
    s = Tcp(cap, PROXY, PLC, 48122, 4840); u = s.open(EPOCH - 0.012)
    s.c2s(u, opcua_create_session("urn:%s:BlackwoodEngStation:client" % ATTACKER))
    s.s2c(u + 0.002, b"MSGF" + struct.pack("<I", 24) + bytes(16))

    # Proxied Modbus session: a read, then the malicious FC16 write at exactly EPOCH.
    m = Tcp(cap, PROXY, PLC, 48124, 502); m.open(EPOCH - 0.006)
    m.c2s(EPOCH - 0.002, modbus_fc3(0x50, 0, 6)); m.s2c(EPOCH - 0.001, modbus_fc3_resp(0x50, [512, 280, 280, 0, 0, 0]))
    m.c2s(float(EPOCH), modbus_fc16(0xA1F2, 100, [0x670C, 0x8B3E, 0x4F54, 0x3234]))
    m.s2c(EPOCH + 0.003, modbus(0xA1F2, 1, struct.pack(">BHH", 16, 100, 4)))
    for k in range(1, 4):
        m.c2s(EPOCH + k * 2.0, modbus_fc16(0xA1F2 + k, 0, [500]))
        m.s2c(EPOCH + k * 2.0 + 0.003, modbus(0xA1F2 + k, 1, struct.pack(">BHH", 16, 0, 1)))
    m.close(EPOCH + 9.0); s.close(EPOCH + 9.5)
    return cap

# ---- pcapng serialization ----
def pad4(b): return b + b"\x00" * ((4 - len(b) % 4) % 4)

def shb():
    body = struct.pack("<IHHq", 0x1A2B3C4D, 1, 0, -1)
    tl = 12 + len(body)
    return struct.pack("<II", 0x0A0D0D0A, tl) + body + struct.pack("<I", tl)

def idb():
    body = struct.pack("<HHI", 1, 0, 0)   # linktype=1 (Ethernet), reserved, snaplen=0
    tl = 12 + len(body)
    return struct.pack("<II", 0x00000001, tl) + body + struct.pack("<I", tl)

def epb(ts, data):
    us = int(round(ts * 1_000_000))
    th, tl_ = (us >> 32) & 0xFFFFFFFF, us & 0xFFFFFFFF
    d = pad4(data)
    body = struct.pack("<IIIII", 0, th, tl_, len(data), len(data)) + d
    tot = 12 + len(body)
    return struct.pack("<II", 0x00000006, tot) + body + struct.pack("<I", tot)

def write_pcapng(path, cap):
    out = bytearray(shb() + idb())
    for t, frame in sorted(cap.pkts, key=lambda x: x[0]):
        out += epb(t, frame)
    open(path, "wb").write(out)
    return len(out)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    cap = build()
    n = write_pcapng(os.path.join(OUT, "edge_span_0200.pcapng"), cap)
    print("wrote edge_span_0200.pcapng (%d bytes, %d packets)" % (n, len(cap.pkts)))
    print("real attacker IP (DNS leak, corroborated by OPC UA ApplicationUri):", ATTACKER)
    print("canonical answer:", ATTACKER)
