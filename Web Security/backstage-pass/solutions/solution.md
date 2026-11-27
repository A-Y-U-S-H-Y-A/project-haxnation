# Backstage Pass

**Category:** Web Security
**Difficulty:** Medium
**Flag format:** `HXN{Flag}`

## Concepts

- JSON Web Tokens (structure, header vs payload, signing): [JWT Introduction](https://jwt.io/introduction)
- JWT attacks, including `kid` header abuse and algorithm confusion: [PortSwigger - JWT attacks](https://portswigger.net/web-security/jwt)
- Path traversal: [PortSwigger - Directory traversal](https://portswigger.net/web-security/file-path-traversal)

## Overview

The portal hands every visitor an `attendee` JWT and gates `/api/backstage`
behind `role: admin`. The server refuses unsigned tokens, and the HMAC secret is
random, so neither the obvious forge nor brute force works. The real flaw is in
*how the server chooses its verification key*: it trusts the token's `kid`
header as a file path. Point `kid` at a file whose bytes you already know,
re-sign the token with those bytes, and the server validates your forged
`admin` pass.

This writeup records the exact steps taken against a running instance, treating
the service as a black box.

---

## Step 1 — Get a normal pass

```
POST /api/register   {"name":"arham"}
```

Response:

```json
{"ok":true,"message":"Welcome, arham. Here is your attendee pass.","pass":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRlZmF1bHQifQ.eyJzdWIiOiJhcmhhbSIsInJvbGUiOiJhdHRlbmRlZSIsInRpZXIiOiJnZW5lcmFsIiwiaWF0Ijo...,"}
```

## Step 2 — Read the pass (no key required)

A JWT is three base64url segments. Decoding the first two:

```
header : {"alg":"HS256","typ":"JWT","kid":"default"}
payload: {"sub":"arham","role":"attendee","tier":"general","iat":...,"exp":...}
```

Two things stand out: we are `attendee` (backstage wants `admin`), and the
header carries a `kid` ("key id") of `default`. `kid` tells the server which key
to verify with.

## Step 3 — The naive forge is blocked

Set the payload to `role: admin` and try the classic `alg: none` (unsigned)
token against the door:

```
GET /api/backstage   Authorization: Bearer <alg:none token>
-> 401 {"ok":false,"error":"pass rejected","detail":"jwt signature is required"}
```

Rejected. The verifier pins the algorithm to HS256, so unsigned passes are out,
and the HMAC secret isn't something we can guess.

## Step 4 — Make the server talk about `kid`

Since `kid` selects the key, send a signed-looking token whose `kid` is a name
that can't exist, and read the error:

```
GET /api/whoami   (token with header kid = "does-not-exist")
-> 401 {"ok":false,"error":"pass rejected",
        "detail":"ENOENT: no such file or directory, open '/app/keys/does-not-exist'"}
```

That leak is the whole challenge. `kid` is concatenated into a filesystem path,
`keys/<kid>`, and read as the signing key. Two consequences:

- It's a **path traversal**: `kid` of `../something` escapes the `keys/` folder.
- Whatever file we point at becomes the HMAC key. If we know that file's exact
  bytes, we can sign our own token.

## Step 5 — Find a file whose bytes we know

The portal serves its own static assets. `brand.js` is referenced by the page
and fetched directly:

```
GET /static/brand.js   -> 200, 528 bytes
sha256: aaa3684613124183204fa948082c58112df73f969b4b4385293552906cb7f8a1
```

We now hold the exact bytes of a file that lives inside the app next to
`keys/`. From `keys/`, the relative path back to it is `../public/brand.js`.
(The repo's own `package.json` works just as well — any in-app file with known
contents does.)

## Step 6 — Forge the admin pass

Build a token with:

- header `{"alg":"HS256","typ":"JWT","kid":"../public/brand.js"}`
- payload `{"sub":"arham","role":"admin","tier":"staff"}`
- HMAC-SHA256 signature using the **raw bytes of `brand.js`** as the key.

Sanity check it:

```
GET /api/whoami   Authorization: Bearer <forged>
-> 200 {"ok":true,"claims":{"sub":"arham","role":"admin","tier":"staff"}}
```

The server loaded `keys/../public/brand.js`, got the same bytes we signed with,
and the signature checked out as `admin`.

## Step 7 — Enter backstage

```
GET /api/backstage   Authorization: Bearer <forged>
-> 200 {"ok":true,"message":"Backstage access granted.","flag":"HXN{...}"}
```

Flag captured.

A ready-to-run reference solver is in [`solve.py`](./solve.py) — point it at the
instance host/port and it walks all seven steps.

---

## Why it works / how to fix it

The bug is trusting attacker-controlled token metadata to locate a key:

```js
const kid = jwt.decode(token, { complete: true }).header.kid; // attacker-controlled
const key = fs.readFileSync(path.join(KEYS_DIR, kid));         // path traversal
jwt.verify(token, key, { algorithms: ['HS256'] });
```

Fixes:

- Never build a filesystem path from `kid`. Map it through an allowlist of known
  key IDs instead.
- Don't let the token pick where the key comes from; the server should already
  know its own key(s).
- Don't echo internal errors (`ENOENT ... /app/keys/...`) back to the client.
