# Solution: State That Executes Itself — code-review-deserialization-rce

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 9
**Difficulty:** Medium · **Points:** 250 · **Answer format:** `HXN{<magic_field_type_hex>_<exec_syscall>}`

## Walkthrough

1. Open `state_serializer.c`. The serializer only ever emits field types `1` (key) and `2` (value) — note that first.
2. Walk `deserialize_state`. The field loop has one branch that isn't data:

   ```c
   if (f->type == 0x41) { ... }
   ```

   `0x41` is `b'A'` — and the application never serializes it; the deserializer *does*. The bytes the file calls "fields" with type `0x41` are **commands**.
3. Inside that branch, a forked child builds `char *args[] = { "/bin/sh", "-c", cmd, NULL };` and calls `execve("/bin/sh", args, environ)`.
4. That is the process-exec primitive — `execve` — wrapping `/bin/sh -c`, exactly the insecure-deserialization pattern: gadget arrives via untrusted input, the deserializer turns it into a syscall.

Submit `HXN{<field_type_hex>_<exec_syscall>}` with the field type as it appears in the source (`0x41`) and the syscall as written.

## Notes for authors

- The log file shows the same marker in the wild: `deserialize_state field type=0x41`, "ignored by application layer" — the warning is for the app, not the backdoor.
- `execve` (not `fork`) does the actual execution — fork is only the process-spawn wrapper.
- Flag value is withheld until the answer-key commit.
