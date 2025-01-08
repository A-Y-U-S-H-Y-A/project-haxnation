# Notes - 1
We built a notes app. Maybe nobody can be called admin?<br/>
Hint 1: Maybe start with recon? Figure out the language and framework the backend of the site uses? Maybe via a 404?<br/>
The flag format is HXN{Flag}.<br/>
Enter the entire flag to validate the challenge.<br/>
## How to setup
- Unzip the server.zip file
- Navigate to the unzipped folder and run the command `docker build -t notes1 .`
- Run the command `docker run -p 5000:5000 notes1`<br />
Access your challenge at `localhost:5000`<br />

**Anitivirus Disabled**: Not needed <br />
**Operating System**: Any <br />
## Solutions and Resources
**Flag**: HXN{$ession1nsecure}

Solutions and resources are available in the 'solutions' folder
