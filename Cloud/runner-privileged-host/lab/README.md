# Runner Lab 1 — Privileged by Design

**Challenge:** Privileged by Design (`runner-privileged-host`) — Chapter 10 · **Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai)

## Scenario

Coinnectar ships on a self-hosted CI runner tagged `privileged` ("because Docker-in-Docker was easier"). This lab reproduces the situation on your own machine, in miniature:

- `hostdisk.img` — a small ext4 image standing in for the runner **host's** disk.
- `coinnectar-ci-job` — the CI **job** sandbox, run `--privileged` (that is the vulnerability).

Everything is local and disposable. Do **not** run this on a shared or production machine.

## Setup

```bash
cd lab
docker compose up --build -d
docker exec -it coinnectar-ci-job bash
```

Requirements: Docker + Docker Compose v2 on Linux, macOS or Windows (Docker Desktop / WSL2). `--privileged` is required for the loop-mount path to work.

## Goal

The flag is on the **host** disk image, under `/opt/ctf/`. The job sandbox can "reach" the host but was never handed the filesystem — you have to take it. When you see `flag.txt`, submit its contents.

## Teardown

```bash
docker compose down --rmi local
```

## Hints

1. `--privileged` does not hand you the contents of the host disk. It hands you the host's **block devices** — and everything that can be a block device.
2. Look around the job's filesystem root. Notice any large file that doesn't belong to the job?
3. A disk image you can see can be mounted.

## Solutions

See `../solutions/solution.md` (warning: spoilers).
