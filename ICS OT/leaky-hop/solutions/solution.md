# The Leaky Hop — Solution

- **Category:** ICS/OT · Network Forensics / PCAP Attribution · **Difficulty:** Easy
- **Artifact:** `edge_span_0200.pcapng` (~2 min, ~700 packets)
- **Answer:** the attacker's real IP → `10.21.37.14`
- **Flag:** `HXN{10.21.37.14}`

## The trick
The malicious sessions to PLC-01 (`192.168.10.101`) all come from the DMZ proxy
`192.168.20.9`. A proxy only relays the TCP stream it carries. It does not resolve names for
the client. `proxychains` ran without `proxy_dns`, so the attacker's own host resolved
`plc01.blackwood.local` itself about 300 ms before the proxy opened its session.

## Noise to get past
- Three other hosts resolve `plc01` too: HMI-01 (`.15`), the historian (`.40`, every 5 s) and
  the engineering workstation (`.30`). Each of them then opens its **own** TCP session to the PLC.
- Two other hosts on the attacker's `10.21.37.0/24` subnet are active: `10.21.37.40` (vendor
  jump host, historian/update lookups and HTTPS to the historian) and `10.21.37.22` (remote
  operator reading the historian). Neither ever touches the PLC.
- There are two OPC UA `CreateSession` requests: the engineering workstation's legitimate one
  (`urn:192.168.10.30:...`) and the proxied one.

## Solve
1. Find the malicious traffic: the proxy's Modbus `FC16` writes to PLC-01 (first at 02:17:34 UTC).
2. List DNS queries for `plc01.blackwood.local`:
   `dns.flags.response == 0 && dns.qry.name == "plc01.blackwood.local"`.
3. Drop every resolver that then connects to the PLC directly. One remains, `10.21.37.14`, and
   its query lands ~300 ms before the proxy's SYN.
4. Confirm it: the **proxied** OPC UA session's ApplicationUri is `urn:10.21.37.14:...`.

Reference parser: `python solutions/resources/solve_c1.py` (the generator is
`generate_c1.py` in the same folder).

## Real-world inspiration
- **Volt Typhoon** (PRC state-sponsored, active against US water, energy and communications
  utilities) routes its traffic through chains of compromised SOHO routers and proxies (the
  "KV-botnet"), so victims only ever see the last hop. Defenders unmask that kind of
  infrastructure with side-channel evidence like the one in this challenge, not with the
  connection log.
- **TRITON / XENOTIME** operators reached the safety controllers of a Saudi petrochemical plant
  (2017) by pivoting through the IT/OT DMZ, the same shape of path as the DMZ proxy here.
- **What you learn:** a relay hides the TCP source but not everything around it. DNS
  resolution, application identifiers (OPC UA ApplicationUri, TLS SNI, client certificates)
  and timing correlation often leak the true origin. For attackers, `proxy_dns` exists for a
  reason. For defenders, keep DNS logs from OT-adjacent networks.
