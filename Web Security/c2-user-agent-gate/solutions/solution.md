# Solution: Phantom Beacon — c2-user-agent-gate

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 2
**Difficulty:** Easy · **Points:** 150 · **Answer format:** `HXN{...}`

## Walkthrough

1. Open `beacon_client.py`. It is an intentionally neutered evidence snippet — the runtime parts you care about are reproduced:
   - `_PLATFORM = "Mozilla/5.0 (X11; Linux x86_64)"`
   - `_PRODUCT = "Coinnectar-Updater/3.4.7"`
   - `_BUILD_TAG_B64 = "QzBMTEVDVDBS"`
2. Decode the build tag: `echo QzBMTEVDVDBS | base64 -d` → it renders a zero-padded collector identifier.
3. Assemble the User-Agent exactly as `_user_agent()` does:

   ```text
   Mozilla/5.0 (X11; Linux x86_64) Coinnectar-Updater/3.4.7 Build/<decoded tag>
   ```

4. The reference client `beacon_capture.http` shows the implant's request shape. The endpoint is `/v1/collect` and path/method do not gate the response — only the `User-Agent` does.
5. Replay the request with the correct header (curl, or the in-page resolver). The server answers with a base64-encoded task object whose `flag` field carries the answer.

### How the checker works (for authors)

The emulated endpoint derives an XOR key from `sha256(User-Agent)` and XORs the stored ciphertext once; a hash match compares the recovered plaintext to the stored hash. There is no live service at the emulated address — the challenge is entirely client-side.

### Manual verification recipe (no server needed)

```python
import base64, hashlib
tag = base64.b64decode("QzBMTEVDVDBS").decode()
ua = f"Mozilla/5.0 (X11; Linux x86_64) Coinnectar-Updater/3.4.7 Build/{tag}"
key = hashlib.sha256(ua.encode()).digest()
ciphertext = bytes.fromhex("c8d05e01433d7f258568c2aae39e91b1d2633ba0b1d13408c1")
flag = bytes(b ^ key[i % len(key)] for i, b in enumerate(ciphertext)).decode()
```

## Notes for authors

- Flag value is withheld until the answer-key commit.
- The challenge as shipped contains no live dependency; the emulation is self-contained.
