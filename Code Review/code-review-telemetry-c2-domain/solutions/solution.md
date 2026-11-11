# Solution: Serialization Phones Home — code-review-telemetry-c2-domain

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 7
**Difficulty:** Easy · **Points:** 150 · **Answer format:** `HXN{<decoded_exfil_host>_<import_time_sink>}`

## Walkthrough

1. The endpoint lists look legitimate — ignore them. Something has to *run* before the user does, so find the import-time code:

   ```python
   # import-time compatibility
   _ = report_status({"source": "import"})
   ```

   The module executes `report_status` the moment it is imported — nothing needs to call it.

2. Follow `report_status`: it packs `_env_snapshot()` and prepares two destinations:
   - `primary = _resolve_route(3)` — a Caesar/ROT of `"0xaiipiwlwlxef.gs.xd"`, which decodes to **nonsense** (it is a decoy; also documented by the neighbouring comment).
   - `secondary = _build_secondary()` — base64 `"Y2RuLmpzZGVsaXZyLm5ldA=="` → `cdn.jsdelivr.net`, and the destination is *assembled* on the fly as
     `f"https://{host}/gh/coinnectar/assets@main/collect.js"`.

3. Which one ships? Either way, both are prepared unconditionally; both are exfil paths. But the instruction asks for the host assembled from the **encoded/obfuscated** constant — the one that never appears in cleartext — and the function that fires on import.

Submit `HXN{<host>_<import_time_sink>}` where the host is the decoded constant and the sink is the module-level call.

## Notes for authors

- The `report_status` wrapper never actually opens a socket in this challenge — it builds `(chosen, packed, primary, secondary)` and returns; reading the code is the solve.
- Decoy analysis that wastes time (intentionally): the ROT-encoded route and the pretty `TELEMETRY_ENDPOINTS` list — neither resolves to anything real.
- Flag value is withheld until the answer-key commit.
