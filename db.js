const sqlite3 = require('sqlite3').verbose();
const fetch = require('cross-fetch');

let db = new sqlite3.Database('./db/db_rate.db', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

const HandleSqlResult = (message) => {
  return (err, res) => {
    if (err) {
      console.log(message);
      console.log(err);
    }
  }
}

const InitializeDb = () => {
  db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS rate(
      id                INTEGER PRIMARY KEY,
      rate_number       INTEGER NOT NULL,
      status            BOOLEAN NOT NULL,
      amount            INTEGER NOT NULL,
      month             INTEGER NOT NULL,
      year              INTEGER NOT NULL
      );`, HandleSqlResult("error creating table for rates"))

    db.run(`
    CREATE TABLE IF NOT EXISTS devices(
      device_id         TEXT PRIMARY KEY,
      token             TEXT NOT NULL
      );`, HandleSqlResult("error creating table for devices"))
  })
}

const DropDB = () => {
  db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS rate;`, HandleSqlResult("error dropping table for rates"));
    db.run(`DROP TABLE IF EXISTS devices;`, HandleSqlResult("error dropping table for rates"));
  })
}

const CloseDb = () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('database connection closed.');
  });
}

const CreateRate = () => {
  db.serialize(() => {
    db.run(`DROP TABLE IF EXISTS rate;`, HandleSqlResult("error dropping table for rates"));
  })
  InitializeDb();

  var tot = 88000
  var rata = 500

  var m = 0
  var y = 2022

  var curr = 0

  var rate = [];
  var cnt = 1;

  while (curr < tot) {
    var a = 0;
    if (tot - curr >= rata) {
      a = rata;
    }
    else {
      a = tot - curr;
    }

    var r = {
      month: m,
      year: y,
      amount: a,
      rate_number: cnt,
      status: false
    }
    rate.push(r);

    curr += a;
    m++;
    cnt++;
    if (m == 12) {
      y++;
      m = 0;
    }
  }

  db.serialize(() => {
    rate.forEach(element => {
      InsertRata(element);
    });
  })

  return "ok";
}

const InsertRata = (rata) => {
  const sql = `INSERT INTO rate (rate_number, status, amount, month, year) VALUES (?,?,?,?,?)`;
  //${rata.rate_number},${rata.status},${rata.amount},${rata.month},${rata.year}
  db.run(sql, [rata.rate_number, rata.status, rata.amount, rata.month, rata.year], HandleSqlResult("error creating rata"));
}

async function GetAllRate() {
  const sql = "SELECT * FROM rate";

  return await QueryDatabase((resolve) => {
    let rate = [];
    db.serialize(() => {
      db.each(sql, [], (err, row) => { if (err) throw err; rate.push(row) }, (complete, count) => resolve(rate));
    })
  })
}

async function UpdateStatoRata(id, status) {
  if (!id)
    throw new Error(`${id} is not a valid ID`);
  if (!status)
    throw new Error(`${status} is not a valid status`);
  const sql = `UPDATE rate SET status=? WHERE id=?`;
  return await QueryDatabase((resolve) => {
    let rate = [];
    db.serialize(() => {
      db.run(sql, [status.status, id], (err, row) => { if (err) throw err; resolve(true) });
    })
    if (status.status)
      InviaNotificaATuttiDevices("Rata pagata!", "Francesco ha pagato i sui debiti anche questo mese. (Yeee)");
    else
      InviaNotificaATuttiDevices("Pagamento rata annullato!", "zio billy");
  })
}

async function GetAllDevices() {
  const sql = "SELECT * FROM devices";

  return await QueryDatabase((resolve) => {
    let devices = [];
    db.serialize(() => {
      db.each(sql, [], (err, row) => { if (err) throw err; devices.push(row) }, (complete, count) => resolve(devices));
    })
  })
}

async function GetDeviceFromId(device_id) {
  const sql = "SELECT * FROM devices WHERE device_id = ? LIMIT 1";

  return await QueryDatabase((resolve) => {
    db.serialize(() => {
      db.each(sql, [], (err, row) => { if (err) throw err; resolve(row) });
    })
  })
}

async function InsertDeviceIfNotExists(device) {
  const sql = `REPLACE INTO devices (device_id, token) VALUES(?,?)`;
  return await QueryDatabase((resolve) => {
    db.serialize(() => {
      db.run(sql, [device.device_id, device.token], (err, row) => { if (err) throw err; resolve(true) });
    })
  })
}

function QueryDatabase(action) {
  return new Promise((resolve, reject) => {
    try {
      action(resolve);
    }
    catch (e) {
      reject(e);
    }
  })
}

async function InviaNotificaATuttiDevices(titolo, testo) {
  const sql = "SELECT * FROM devices";
  db.serialize(() => {
    db.each(sql, [], async (err, row) => {
      if (!err)
        await InviaNotificaDevice(titolo, testo, row);
    });
  })
}

function InviaNotificaDevice(titolo, testo, device) {
  const message = {
    to: device.token,
    title: titolo,
    body: testo
  };

  return fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

module.exports = {
  InitializeDb,
  CloseDb,
  DropDB,

  CreateRate,
  GetAllRate,
  UpdateStatoRata,

  GetAllDevices,
  InsertDeviceIfNotExists
}