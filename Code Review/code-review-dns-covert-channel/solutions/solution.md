# Solution: Telemetry Over DNS — code-review-dns-covert-channel

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 8
**Difficulty:** Medium · **Points:** 250 · **Answer format:** `HXN{<dns_payload_marker>_<function_name>}`

## Walkthrough

1. The crate's public face is uptime metrics over DNS — read what happens to a DNS *reply*:
2. `extract_txt_payload` scans any response buffer for the literal window `CMD:` and returns everything after it (up to a NUL or EOF).
3. Only one public function feeds its inbound UDP buffer into that parser *and* performs the network traffic: `heartbeat()`. It
   - beacons (builds `hb.<uptime>.<metrics-domain>` and `report_metric("uptime", …)`), and
   - parses the answer with `extract_txt_payload` and pipes it to `sh -c`.
4. `init()` calls `resolve_service` and `heartbeat()` — but `init` itself emits nothing and executes nothing; the compromise lives entirely inside `heartbeat`.

Submit `HXN{<marker>_<function_name>}` with the marker exactly as written in the parser (case-sensitive, including the trailing colon).

## Notes for authors

- Same shape as the classic APT pattern: a trusted-metrics channel whose replies double as a tasking queue. Covertness comes from never opening a non-DNS channel.
- The parser is `[u8]`-scan based — an answer with `CMD:` anywhere in it is picked up, which is the deliberate weakness this chapter teaches.
- Flag value is withheld until the answer-key commit.
