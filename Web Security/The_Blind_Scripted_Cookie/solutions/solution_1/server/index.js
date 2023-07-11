const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors')

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({ origin: true }))

app.get('/', (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.send('Hello World')
})

app.post('/submit', (req, res) => {
  const message = req.body.message;
  console.log(req)
  console.log(message)
  res.header("Access-Control-Allow-Origin", "*");
  res.send('Form submitted successfully!');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
