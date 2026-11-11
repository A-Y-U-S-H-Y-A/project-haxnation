# Runner Lab 2 — Escape the Job

**Challenge:** Escape the Job (`runner-docker-escape`) — Chapter 11 · **Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai)

## Scenario

The second sandbox is **not** privileged — but the build pipeline mounts the Docker socket into it "for builds". Whoever can speak to the daemon can ask it to start a new container, with whatever mounts they choose, and that container lands on the **host**.

This lab reproduces it locally, in miniature:

- `coinnectar-host` — the "host" (a container standing in for the runner's machine). Its `/opt/ctf/` holds `flag2.txt` — stored base64-encoded.
- `coinnectar-build-job` — the PR-build sandbox, **unprivileged**, but with `/var/run/docker.sock` mounted.
- `coinnectar-hostfs-init` — provisioning job (writes the flag, then exits).

Everything is local and disposable. Do **not** run this on a shared or production machine.

## Setup

```bash
cd lab
docker compose up -d
docker exec -it coinnectar-build-job sh
```

Requirements: Docker + Docker Compose v2. The escape itself works because the sandbox shares the host's Docker daemon.

## Goal

A flag exists **only on the host** — not in the build job, not in the host's container layers you can see from inside. Use the socket to reach the host filesystem, find `flag2.txt`, decode it, submit.

## Teardown

```bash
docker compose down -v --rmi local
```

## Hints

1. The daemon, not your container, ultimately owns the filesystem. What does `-v /:/host` (or any mount you ask for) give a container you start?
2. The host keeps its secrets in `/opt/ctf/` on the "real" host filesystem — which is just a Docker volume here. `docker volume ls` sees everything the daemon sees. It may help to inspect before you mount.
3. The flag is not stored in the clear — decode what you recover.

## Solutions

See `../solutions/solution.md` (warning: spoilers).
