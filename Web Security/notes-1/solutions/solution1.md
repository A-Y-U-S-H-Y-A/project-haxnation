## Procedure
Generate an error page to find out the web server runs Flask. Post login, find that the session cookie is a flask session. Decode it to find the username to be a part of the session. Run a brute-force attack on the session key on your local system using the rockyou list. Use the new key 'qwerty' to encode and encrypt a new session with the username as admin. Refresh the page to find the flag.<br/>

## Solution by
- Ayushya Shah
