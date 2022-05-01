const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
const cron = require('node-cron');
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

async function checkRateInRitardo() {
  let rate = await db.GetAllRate();

  for(let r in rate)
  {
    let rata = rate[r];
    let scadenza = new Date();
    scadenza.setFullYear(rata.year);
    scadenza.setMonth(rata.month);
    scadenza.setDate(1);
    scadenza.setHours(0);

    if (scadenza < Date.now() && rata.status == 0) {
      return rata;
    }
  }
  return null;
}

app.get('/rate/', (req, res) => {
  HandleRequest(req, res, () => db.GetAllRate());
})

app.put("/rate/:id", (req, res) => {
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

app.listen(port, "0.0.0.0", async () => {
  db.InitializeDb();
  console.log(`Example app listening at http://localhost:${port}`)
})


/*
cron.schedule('* * * * *', function(){});
* * * * * *
| | | | | |
| | | | | day of week
| | | | month
| | | day of month
| | hour
| minute
second ( optional )

Schedule tasks to be run on the server.
*/
cron.schedule('0 12 * * *', async function () {
  //console.log('running a task every minute');
  const rata = await checkRateInRitardo();

  if(rata != null)
  {
    db.InviaNotificaATuttiDevices("Rata da pagare!", `rata ${rata.rate_number} con scadenza ${rata.month + 1}/${rata.year} è da pagare!`);
  }
});

