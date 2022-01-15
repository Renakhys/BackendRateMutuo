const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
const fetch = require('cross-fetch');
dotenv.config();

const db = require("./db");

const app = express()
app.use(bodyParser.json())
const port = process.env.PORT

async function HandleRequest(req, res, action) {
  var resp = {
    error: false
  }
  try {
    resp.data = await action();
  }
  catch (err) {
    resp.error = true
    resp.message = err.message;
    console.log(err);
  }
  res.send(JSON.stringify(resp));
}

app.get('/rate/', (req, res) => {
  HandleRequest(req, res, () => db.GetAllRate());
})

app.put("/rate/:id", (req, res) =>{
  HandleRequest(req, res, () => db.UpdateStatoRata(req.params.id, req.body));
})

app.get('/devices/', (req, res) => {
  HandleRequest(req, res, () => db.GetAllDevices());
})

app.get('/devices/:device_id', (req, res) => {
  HandleRequest(req, res, () => GetDeviceFromId(req.params.device_id));
})

app.get('/test/', (req, res) => {
  res.send(JSON.stringify(db.CreateRate()));
})

app.post('/devices/', (req, res) => {
  HandleRequest(req, res, () => db.InsertDeviceIfNotExists(req.body).then(s => s ? "aggiunto" : "già presente"));
})

app.listen(port, async () => {
  db.InitializeDb();  
  console.log(`Example app listening at http://localhost:${port}`)
})

