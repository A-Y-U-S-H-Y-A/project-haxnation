from config import my_string, shift, my_prime, config_e
from Crypto.Util.number import long_to_bytes, bytes_to_long
from Crypto.PublicKey import RSA

def caesar_cipher(text, shift):
    result = ""
    
    for char in text:
        if char.isalpha():
            if char.isupper():
                shifted_char = chr((ord(char) - ord('A' if char.isupper() else 'a') + shift) % 26 + ord('A'))
            else:
                shifted_char = chr((ord(char) - ord('a' if char.islower() else 'A') + shift) % 26 + ord('a'))
            result += shifted_char
        else:
            result += char
    
    return result

plaintext = my_string
encrypted_text = caesar_cipher(plaintext, shift)
print("Encrypted:", encrypted_text)


# Given prime numbers
primes_arr = my_prime # You can adjust these values as needed


# Given public exponent
print(config_e)


# Create public key 'n'
n = 1
for j in primes_arr:
    n *= j
print("[+] Public Key: ", n)
print("[+] size: ", n.bit_length(), "bits")

# Calculate totient 'Phi(n)'
phi = 1
for k in primes_arr:
    phi *= (k - 1)

# Calculate private key 'd'
d = pow(config_e, -1, phi)

# Encrypt Flag
enc_flag = bytes_to_long(encrypted_text.encode())
_enc = pow(enc_flag, config_e, n)

# Write Encrypted Flag to File
with open("flag_encrypted.txt", "wb") as flag_file:
    flag_file.write(_enc.to_bytes(n.bit_length(), "little"))

# Export RSA Key
rsa = RSA.construct((n, config_e))
with open("public.pem", "w") as pub_file:
    pub_file.write(rsa.exportKey().decode())

print("Encryption complete.")


