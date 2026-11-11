# Solution: Hammertoss Redux — deaddrop-resolver

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 3
**Difficulty:** Medium · **Points:** 250 · **Answer format:** `HXN{...}`

## Walkthrough

Start at `deaddrop/collect.js` — it is a perfectly innocent-looking RUM/telemetry snippet. The chain reveals itself one hop at a time:

1. **Hop 1 — base64 in a comment.** `build-manifest:` carries a base64 blob. Decode it → `coinnectar-deaddrop v2; next=u/e1i4s-v.html`.
2. **Hop 2 — zero-width steganography.** Fetch `deaddrop/u/e1i4s-v.html`. The bio paragraph contains zero-width characters (`U+200B` = 0, `U+200C` = 1); decode in 8-bit groups → `KEY=h4mm3rt0ss;next=d/final.txt`.
3. **Hop 3 — encrypted node.** Fetch `deaddrop/d/final.txt`. It carries `cipher_hex=` — a single-line record noting the payload is XOR-encrypted under `sha256(KEY)`.

   ```python
   import hashlib
   key = hashlib.sha256(b"h4mm3rt0ss").digest()
   ciphertext = bytes.fromhex("740b37b8e64b56ccc16d12afee4c96f2f04fea44c6e45e82f47f7a505c91")
   plaintext = bytes(c ^ key[i % len(key)] for i, c in enumerate(ciphertext)).decode()
   ```

4. The plaintext is the final C2 string and the answer.

Every hop is consistent with the story: APT29-style benign hosts doing quiet pointer duty; defenders see CDN traffic, not key exchange. Nothing is hosted — the files are in this repository, so `curl` works exactly as the implant would (raw URLs, or your local clone).

## Notes for authors

- The in-page resolver (`hammertoss` widget) performs these steps for the player; it exists so the chapter can be played entirely inside the CTF app. The manual path is fully valid.
- The zero-width file must be preserved byte-for-byte (it is in this repo as `assets/deaddrop/u/e1i4s-v.html`).
- Answer: `HXN{d34ddr0p_h4mm3rt0ss_ch41n}`.
