import random
import string

def rotate(text, key):
    result = ""
    for char in text:
        if char.isalpha():
            offset = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - offset + key) % 26 + offset)
        else:
            result += char
    return result

def xor(text, key):
    result = ""
    key_length = len(key)
    for i in range(len(text)):
        result += chr(ord(text[i]) ^ ord(key[i % key_length]))
    return result

def generate_random_string(length):
    letters = string.ascii_uppercase
    return ''.join(random.choice(letters) for _ in range(length))


rot_key = int()
xor_key = str('') # Flag


plaintext = input("Enter plaintext: ")
rotated_text = rotate(plaintext, rot_key)
encrypted_text = xor(rotated_text, xor_key)

print(encrypted_text)