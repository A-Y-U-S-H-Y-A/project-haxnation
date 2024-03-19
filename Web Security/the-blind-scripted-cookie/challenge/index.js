const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const puppeteer = require("puppeteer");
const port = 8080;
var hash;
var magic_cookie;
// Set up Express app
const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

async function test(content) {

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-sandbox",
      "--use-gl=egl",
      "--disable-setuid-sandbox",
      '--enable-features=ExperimentalJavaScript',
      '--window-size=1920,1080',
    ],
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  
  await page.setUserAgent("CTF{King0fCTF}");
  await page.setContent(content, {waitUntil: 'networkidle2', runScripts: 'dangerously'});
  await page.waitForSelector('body');
  
  console.log(await page.content())

  await browser.close();
  return true

}

app.get('/', (req, res) => {
  res.send('Please proceed to /login . If any problems, drop an email to admin@admin.com')
})




app.get('/success', (req, res) => {
  res.send('Message Sent')
})

app.get('/fail', (req, res) => {
  res.send('Message could not be sent')
})
// Protected dashboard route
app.get('/dashboard', (req, res) => {
  // Ensure the user is authenticated

  if (req.cookies.email) {
    hash = crypto.createHash("sha256");
    hash.update(req.cookies.email);
    magic_cookie = hash.digest("hex") + 'a';
    if (req.cookies.a_secure_cookie_i_hope == magic_cookie) {
      if (req.cookies.email == 'admin@admin.com') {
        res.sendFile(path.join(__dirname, '/views/post.html'));
      }
      else {
        res.send('Hello There! Can you see the flag? Nope? Maybe get the admin can ask John?');
      }
    }
    else {
      res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
});

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/login.html'));
});

app.post('/login', (req, res) => {
  if (req.body.username != 'admin@admin.com') {
    res.cookie('email', req.body.username)
    hash = crypto.createHash("sha256");
    hash.update(req.body.username);
    magic_cookie = hash.digest("hex") + 'a'; // To increase challenge complexity
    res.cookie('a_secure_cookie_i_hope', magic_cookie)
    res.redirect('/dashboard')
  }
  else {
    res.redirect('/login')
  }
});

app.post('/send_message', async (req, res) => {
  if (req.cookies.email && req.cookies.email == 'admin@admin.com') {
    hash = crypto.createHash("sha256");
    hash.update(req.cookies.email);
    magic_cookie = hash.digest("hex") + 'a';
    if (req.cookies.a_secure_cookie_i_hope == magic_cookie) {
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Messages</title></head><body>CTF{WebHaxStonks}<h1>Messages</h1>{payload}</body></html>'
      html = html.replace('{payload}', req.body.message)
      try {
        await test(html)
      }
      catch (e) {
        console.log(e)
        res.redirect('/fail')
      }
      res.redirect('/success')
    }
    else {
      res.redirect('/fail');
    }
  } else {
    res.redirect('/fail');
  }
})

// Logout route
app.get('/logout', (req, res) => {
  res.clearCookie('email')
  res.clearCookie('a_secure_cookie_i_hope')
  res.redirect('/');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
