# Solution: The Helpful Config Loader — code-review-insecure-config-backdoor

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 6
**Difficulty:** Medium · **Points:** 200 · **Answer format:** `HXN{<magic_marker_hex>_<decoded_exec_sink>}`

## Walkthrough

1. Grep the obvious sinks — nothing matches `os.system` or `eval`. Follow the decrypt path instead:
2. `_MARKER = bytes([0xca, 0xfe, 0xba, 0xbe, 0xde, 0xad, 0xbe, 0xef])` — the "encrypted config" magic. If plaintext starts with it, the rest of the blob is treated as a **command**.
   - Marker hex: `cafebabedeadbeef`
3. The command is executed via `_resolve(_d("c3lzdGVt"))`:
   - `_d("b3M=")` → `__import__("os")`
   - `_d("c3lzdGVt")` → `base64.b64decode("c3lzdGVt")` → `system`
   - i.e. `os.system(cmd)`

Submit `HXN{<marker_hex>_<decoded_sink>}` with the marker exactly as it appears in the file and the sink as an attribute path on the module it came from — the answer has both halves.

## Notes for authors

- The challenge is a source audit: no execution of untrusted code is required to solve it.
- Red herrings: `health_check()` builds a `ping -c 1 <host>` template and firms `subprocess` usage; `get_runtime_info` reaches for `/etc/passwd`-ish content on day ≥ 26; `_internal_maintenance` reuses `safe_invoke` with `os`/`system` too, but through a different decode path (`_resolve` on this one). Every path funnels into `os`, but the backdoor *branch that flips config into code* is the `_MARKER` one.
- Answer: `HXN{cafebabedeadbeef_os.system}`.
