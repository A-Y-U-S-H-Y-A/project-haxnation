"""Reference solver for C1: parse edge_span_0200.pcapng with no libraries, recover the
real attacker IP from the direct DNS A query for plc01.blackwood.local, confirm it via
the OPC UA ApplicationUri, and take the intrusion epoch from the first Modbus FC16 write.
"""
import os, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PCAP = os.path.normpath(os.path.join(HERE, "..", "..", "edge_span_0200.pcapng"))

def packets(path):
    d = open(path, "rb").read(); off = 0
    while off + 8 <= len(d):
        btype, blen = struct.unpack_from("<II", d, off)
        if btype == 0x00000006:  # EPB
            _if, th, tl = struct.unpack_from("<III", d, off + 8)
            caplen = struct.unpack_from("<I", d, off + 20)[0]
            data = d[off + 28: off + 28 + caplen]
            ts = ((th << 32) | tl) / 1_000_000
            yield ts, data
        off += blen
        if blen == 0: break

def ipstr(b): return ".".join(str(x) for x in b)

def parse_eth_ip(frame):
    if len(frame) < 34: return None
    eth_type = struct.unpack_from(">H", frame, 12)[0]
    if eth_type != 0x0800: return None
    ihl = (frame[14] & 0x0F) * 4
    proto = frame[23]
    src = ipstr(frame[26:30]); dst = ipstr(frame[30:34])
    l4 = frame[14 + ihl:]
    return {"src": src, "dst": dst, "proto": proto, "l4": l4}

def dns_qname(payload, off):
    labels = []
    while True:
        ln = payload[off]; off += 1
        if ln == 0: break
        labels.append(payload[off:off + ln].decode("ascii", "replace")); off += ln
    return ".".join(labels), off

PLC = "192.168.10.101"
PROXY = "192.168.20.9"

def main():
    fc16_epoch = None
    plc01_queries = []          # (ts, src) of DNS A queries for plc01
    direct_clients = set()      # hosts that opened their own TCP session to the PLC
    proxy_syns = []             # times the proxy opened a session to the PLC
    proxied_uris = []           # ApplicationUris seen inside proxied OPC UA sessions
    for ts, frame in packets(PCAP):
        p = parse_eth_ip(frame)
        if not p: continue
        if p["proto"] == 17:  # UDP
            udp = p["l4"]; sport, dport = struct.unpack_from(">HH", udp, 0)
            if dport == 53:
                dns = udp[8:]
                flags = struct.unpack_from(">H", dns, 2)[0]
                qname, _ = dns_qname(dns, 12)
                if (flags & 0x8000) == 0 and qname == "plc01.blackwood.local":
                    plc01_queries.append((ts, p["src"]))
        elif p["proto"] == 6:  # TCP
            tcp = p["l4"]; doff = ((tcp[12] >> 4) & 0xF) * 4
            payload = tcp[doff:]
            sport, dport = struct.unpack_from(">HH", tcp, 0)
            if p["dst"] == PLC and tcp[13] == 0x02:   # SYN to the PLC
                (proxy_syns.append(ts) if p["src"] == PROXY else direct_clients.add(p["src"]))
            if p["src"] == PROXY and b"CreateSessionRequest" in payload:
                i = payload.find(b"urn:"); j = payload.find(b":BlackwoodEngStation", i)
                if j > i: proxied_uris.append(payload[i:j].decode("ascii", "replace"))
            if p["src"] == PROXY and dport == 502 and len(payload) >= 8 and payload[7] == 16:
                if fc16_epoch is None:
                    fc16_epoch = int(ts)
    # The leak: a host that resolved plc01 just before a proxied session but never
    # connected to the PLC itself (its traffic went through the proxy).
    suspects = sorted({src for ts, src in plc01_queries
                       if src not in direct_clients and any(0 < s - ts < 1.0 for s in proxy_syns)})
    print("plc01 resolvers             :", sorted({s for _, s in plc01_queries}))
    print("  ...of which connect direct:", sorted(direct_clients))
    print("resolver w/o direct session :", suspects)
    attacker_ip = suspects[0] if len(suspects) == 1 else None
    uri_ip = proxied_uris[0].split(":")[1] if proxied_uris else None
    print("attacker IP via DNS leak    :", attacker_ip)
    print("OPC UA ApplicationUri -> IP :", uri_ip)
    print("(first FC16 seen at epoch)  :", fc16_epoch)
    print("CANONICAL ANSWER            :", attacker_ip)
    ok = (attacker_ip == "10.21.37.14" and uri_ip == "10.21.37.14")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
