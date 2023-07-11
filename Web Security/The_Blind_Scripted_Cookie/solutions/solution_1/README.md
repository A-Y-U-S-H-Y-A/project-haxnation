# Solution 1
- Download the payload and server folders
- On the site, login with any creds (/login) and modify the cookie such that the email cookie is admin@admin.com and the a_secure_cookie_i_hope is the sha256 value of the same with an a added to the end (5edfa2692bdacc5e6ee805c626c50cb44cebb065f092d9a1067d89f74dacd326a)
- Refresh the /dashboard path to get access to the message sending functionality
- Run the server provided in the solution using node (npm install)(node index.js)
- Make sure the server is accessable via the internet by using a service such as ngrok
- Modify the payload provided in the payload folder to contain the newly generated ngrok link
- Submit the payload as a message to John and wait until the command line has an output
- Scan the output for the flag matching the required parameter