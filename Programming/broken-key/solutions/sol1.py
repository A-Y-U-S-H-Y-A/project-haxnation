from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from itertools import product
import string

# Incomplete RSA private key (with underscores where the unknown characters are)
incomplete_key = """-----BEGIN RSA PRIVATE KEY-----
MIICdgIBADANBgkqh_iG9w0BAQEFAASCAmAwggJcAgEAAoGBAM_yjZxOALwNLsVqfhFawLPqVxLs9VcqsSLYuIqjAju_wo38jldM3gQ4z6nP7sor6fbrelo61YpFRuktK+OCsoYUTn1buqsQmdPq6uzvNsk+zcxFWZX16d0M3Sz8gYnbZHD3QgDQAni7TZBLWINGSvVFApcqvYOnwdYm7ckjvkWDAgMBAAECgYEAvnPNDQfujItafw0m7aZa/PxHZo1U185KmUcEN6Yt7CYjrBd8hNSv7QpbZyKpFrULRRtKoO5hgvbsStqHO2Rlnts35LJKiXQ5Ps5sikP5hM8BUmvJnNCf4jQd2RlK7YWkVGUMTQn9UXZoF/5q30zZUlbx2aHP9NGLZxdOp5mrT5ECQQD/3QB+F2fdRPpJB2dT1W+LUd4rujxED1uQzddstrzi/pxUSLpFgKo2+5bwk3yZn8Ia6SZgouX69bjeiWs9h0mVAkEAyw5QLUCUbpogPM1EOIXJDaA8zKRElOvmxijvyN4pO7BWrteZ0GsZO/p4EPUJgZFnfm4ekMWZXWBlO3KmCrL8twJAUEm0PtzvXbKoa0Qke10NXIV7FvOgt6auD/lXsSiCiyRkP9p2gRrHzusRyTourjJAgZtJzKcxTZfPxB0RBsSuJQJAGZ+OwocZs/NDCikk6LUJL+z+fxxjgx9ZmbvktkZCkcOozJtsT36USptKt2kUcAM3Oh8PQFmPBtd5Ls1C4qq/dQJATrra/z0QoQ+ciAKm6LdzN+IEMMrSoTWDy2lTMcw4V9tf9CXKGb+FUFREMoWZc69T+tiFo+qzdAEewQcHz8kGFA==
-----END RSA PRIVATE KEY-----"""

# Possible characters that could replace the underscores
possible_chars = string.ascii_letters + string.digits + '+/='

# Replace the underscore with all possible combinations of characters
def brute_force_key(incomplete_key):
    # Find where the underscores are in the key
    missing_indices = [i for i, char in enumerate(incomplete_key) if char == '_']
    
    # Brute force all combinations for missing characters
    for replacement in product(possible_chars, repeat=len(missing_indices)):
        key_attempt = list(incomplete_key)
        for i, char in zip(missing_indices, replacement):
            key_attempt[i] = char
        key_attempt = ''.join(key_attempt)

        try:
            # Try loading the key
            key = serialization.load_pem_private_key(
                key_attempt.encode(),
                password=None,
                backend=default_backend()
            )
            print(f"Valid key found:\n{key_attempt}")
            return key_attempt
        except Exception as e:
            pass

# Run the brute-force attack
brute_force_key(incomplete_key)
