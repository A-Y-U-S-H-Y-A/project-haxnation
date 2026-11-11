# Solution: The First Bad Commit — first-bad-commit

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 1
**Difficulty:** Easy · **Points:** 100 · **Answer format:** `<full 40-char commit sha>`

## Walkthrough

1. Clone the repository from either mirror in the challenge links.
2. Review the history chronologically — start from the initial release and move forward:

   ```bash
   git clone https://github.com/alex-rivers-coincollector/Coinnectar.git
   git log --reverse --format='%h %ad %an %s' --date=short
   ```

3. The honest work (serializer, release tags, CI/docs/encryption helpers) comes from Alex Rivers. Around the 3.4 "stability" milestone, a series of commits land from the same contributor, all wearing the costume of compatibility/telemetry work.
4. Notice the structure: four suspicious commits arrive in sequence — a "versioned payload format" style change lands first, and the later ones all depend on it. Those are the backdoors (they line up one-to-one with Chapters 6–9 of the storyline).
5. The origin is the **first** of that sequence — the one that "introduced to support" the rest. Submit its full 40-character SHA.

The flag is a commit hash, so the answer is public by design — but only once you find it. A `git log --oneline` skim is not enough; read the author dates and the diffs, not the commit messages.

## Notes for authors

- The answer is `201477f1b5eed445085a81c460320d0dff104344` (the first of the four supply-chain commits to land in 3.4 stability work). The answer is also plaintext in this challenge's `challenge.json` as of the answer-key drop.
- The accompanying GitLab origin mirror is the reference copy of the history.
