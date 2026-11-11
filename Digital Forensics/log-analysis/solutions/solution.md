# Solution: Correlate the Trace — log-analysis

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 5
**Difficulty:** Medium · **Points:** 200 (60 + 60 + 80) — three questions, all answerable from `app-logs.log` alone.

## Question 1 — the bad probe (60 pts)

Every health check drives a connectivity probe at the same host, `metrics.internal.corp`. Sort the odd one out:

```bash
grep 'connectivity probe' app-logs.log | sort | uniq -c
```

Exactly one line differs — and instead of the hostname it carries an injected fragment:

```text
executing connectivity probe host=10.0.1.15;id
```

Submit the host= value **verbatim**: `10.0.1.15;id`.

## Question 2 — the beacon destination (60 pts)

The `report_metrics` scheduled task ships a payload whose size grows steadily (72 → 204 → 468). Pinpoint the destination:

```bash
grep report_metrics app-logs.log
```

All runs go to the same `https://telemetry.coinnectar.dev/v1/collect`. Submit the hostname only: `telemetry.coinnectar.dev`.

## Question 3 — the day-gated marker (80 pts)

The extra-collection branch activates when `collect_extra == 1` (day >= 26). During those windows the runtime leaks a correlation fragment per collection, in wall-clock order. Collect the `corr=` fragments from those lines **only** (in timestamp order):

```bash
grep -B2 'corr=' app-logs.log
```

Concatenate them in file order and base64-decode:

```bash
paste <(grep -o 'corr=[^ ]*' app-logs.log | cut -d= -f2) | tr -d '\t' | base64 -d
```

(The fragments are six `corr=` values — join them stringwise, exactly as logged, then decode.)

## Notes for authors

- Every answer is derived from the log; no external service is involved.
- Answers: Q1 `10.0.1.15;id` · Q2 `telemetry.coinnectar.dev` · Q3 `HXN{l0g5_t3ll_4_st0ry}`.
