(function () {
  'use strict';

  /* INITIALISATION */

  const HTTP_PORT = 8080;
  const HTTPS_PORT = 4433;
  const MAX_CHANNELS = 6;
  let receiveCounter = 1;

  const fs = require('fs');
  const mysql = require('mysql');
  const crypto = require('crypto');
  const express = require('express');
  const bodyParser = require("body-parser");
  const http = require('http');
  const https = require('https');
  const rawParser = bodyParser.raw(); //is needed to interpretate the bytebuffer from the mC
  const httpApp = express();
  const app = express();

  //bind socket io to express
  app.io = require('socket.io')();

  //initialize socket authentication
  require('socketio-auth')(app.io, {
    authenticate: authenticate,
    postAuthenticate: postAuthenticate,
    timeout: 'none'
  });

  //open db connection
  let dbConn = mysql.createConnection({
    host: 'localhost',
    database: 'openremotedb',
    user: 'node',
    password: ''
  });

  dbConn.connect(function(err) {
    if(err) {
      console.log('Error connecting to DB');
      return;
    }
    console.log('DB-Connection established');
  });

  // get certificate and key for https
  const httpsOptions = {
    key: fs.readFileSync('tls/privkey.pem'),
    cert: fs.readFileSync('tls/fullchain.pem'),
    ca: fs.readFileSync('tls/chain.pem')
  };

  //set root directory for htmlserving
  app.use(express.static(__dirname+'/'));

  //server listener
  http.createServer(httpApp).listen(HTTP_PORT, function() {
    console.log(`Express HTTP server listening on port ${HTTP_PORT}`);
  });

  let server = https.createServer(httpsOptions, app).listen(HTTPS_PORT, function() {
    console.log(`Express HTTPS server listening on port ${HTTPS_PORT}`);
  });

  //Attach socket.io to https server
  app.io.attach(server);


  /* MC RELATED CODE */

  httpApp.post("/remote/id:userId", rawParser, function(req, res) {
    let userId = req.params.userId;
    //fetchCipherKey
    let query = `
      select
        cipherKey
      from
        account
      where
        id = ?
    `;
    let values = [userId];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return;
      }
      if(result.length === 0) {
        console.log('httpApp.post: postrequest from unknown User');
        return;
      }
      else {
        let requestData = Buffer.from(req.body);
        let cipherKey = result[0].cipherKey;
        let iv = Buffer.alloc(16);
        let payload = Buffer.alloc(48);
        requestData.copy(iv, 0, 0, 16);
        requestData.copy(payload, 0, 16);
        console.log(receiveCounter + ': ' + new Date().toISOString());
        payload = decrypt(payload, iv, cipherKey);
        console.log(payload);
        if(validateIncomingData(payload)) {
          handleIncomingData(payload, userId);
          fetchSettings(userId, function(settings) {
            settings = alterOutputMode(userId, settings);
            let payload = generateOutgoingData(settings);
            let iv = Buffer.alloc(16);
            let encryptedPayload = Buffer.alloc(48);
            let responseData = Buffer.alloc(64);
            //generate sendData without an byte with value of 255 (because of the fail of the gsm library in the device)
            while(true) {
              iv = crypto.randomBytes(16);
              encryptedPayload = encrypt(payload, iv, cipherKey);
              responseData = Buffer.concat([iv, encryptedPayload]);
              if(responseData.includes(255)) {
                continue;
              }
              console.log(payload);
              break;
            }
            res.set('Content-Type', 'application/octet-stream');
            res.set('Connection', 'close');
            res.send(responseData);
            receiveCounter++;
          });
        }
        else {
          console.log('httpApp.post: payload validation failed');
          return;
        }
      }
    });
  });

  function decrypt(encryptdata, iv, key) {
    let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);
    let cleardata = decipher.update(encryptdata);
    cleardata = Buffer.concat([ cleardata, decipher.final() ]);
    return cleardata;
  }

  function encrypt(cleardata, iv, key) {
    let encipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    encipher.setAutoPadding(false);
    let encryptdata = encipher.update(cleardata);
    encryptdata = Buffer.concat([ encryptdata, encipher.final() ]);
    return encryptdata;
  }

  //validate incoming payload from mC
  function validateIncomingData(payload) {
    if(
      payload[0] != 16 ||
      payload[16] != 32 ||
      payload[32] != 48 ||
      payload[3] > 2 ||
      payload[6] > 2 ||
      payload[9] > 2 ||
      payload[12] > 2 ||
      payload[15] > 2 ||
      payload[19] > 2
    ) {
      return false;
    }
    return true;
  }

  //store received data sent from mC to the dB and send it to the frontend
  function handleIncomingData(payload, userId) {
    let inputValue = [];
    inputValue[0] = payload.readUInt16BE(1);
    inputValue[1] = payload.readUInt16BE(4);
    inputValue[2] = payload.readUInt16BE(7);
    inputValue[3] = payload.readUInt16BE(10);
    inputValue[4] = payload.readUInt16BE(13);
    inputValue[5] = payload.readUInt16BE(17);

    let timeStamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    //storeInputValues
    let query = `
      insert into
        inputvalue
        (id, number, timeStamp, value)
      values
        (?, ?, ?, ?)
    `;
    for(let i = 0; i < inputValue.length; i++) {
      let values = [userId, i + 1, timeStamp, inputValue[i]];
      dbConn.query(query, values, function(err, result) {
        if(err) {
          console.error(err);
          return;
        }
      });
    }

    app.io.in(userId).emit('updateAnalogValues', inputValue);

    let outputStatus = [];
    outputStatus[0] = payload[3];
    outputStatus[1] = payload[6];
    outputStatus[2] = payload[9];
    outputStatus[3] = payload[12];
    outputStatus[4] = payload[15];
    outputStatus[5] = payload[19];

    fetchOutputMode(userId, function(userId, data) {
      for(let i = 0; i < outputStatus.length; i++) {
        if(outputStatus[i] !== 0) {
          console.log(outputStatus[i]);
          console.log(data[i]);
          if(data[i] != outputStatus[i]) {
            let outputMode = outputStatus[i] + 4;

            //TODO: email or push notification
            storeOutputMode(userId, {mode: outputMode, channel: i + 1}, function(res) {
              console.log(res);
            });
            app.io.in(userId).emit('updateOutputMode', {channel: i + 1, mode: outputMode});
          }
        }
      }
    });
  }

  //generate payload with configuration for sending to the mC
  function generateOutgoingData(settings) {
    let payload = Buffer.alloc(48);
    let channel = settings.channel;

    payload.writeUInt8(16, 0);

    payload.writeUInt16BE(channel[0].lowTriggerValue, 1);
    payload.writeUInt16BE(channel[0].highTriggerValue, 3);
    payload.writeUInt8(channel[0].triggerMode, 5);

    payload.writeUInt16BE(channel[1].lowTriggerValue, 6);
    payload.writeUInt16BE(channel[1].highTriggerValue, 8);
    payload.writeUInt8(channel[1].triggerMode, 10);

    payload.writeUInt16BE(channel[2].lowTriggerValue, 11);
    payload.writeUInt16BE(channel[2].highTriggerValue, 13);
    payload.writeUInt8(channel[2].triggerMode, 15);

    payload.writeUInt8(32, 16);

    payload.writeUInt16BE(channel[3].lowTriggerValue, 17);
    payload.writeUInt16BE(channel[3].highTriggerValue, 19);
    payload.writeUInt8(channel[3].triggerMode, 21);

    payload.writeUInt16BE(channel[4].lowTriggerValue, 22);
    payload.writeUInt16BE(channel[4].highTriggerValue, 24);
    payload.writeUInt8(channel[4].triggerMode, 26);

    payload.writeUInt16BE(channel[5].lowTriggerValue, 27);
    payload.writeUInt16BE(channel[5].highTriggerValue, 29);
    payload.writeUInt8(channel[5].triggerMode, 31);

    payload.writeUInt8(48, 32);

    payload.writeUInt8(channel[0].outputMode, 33);
    payload.writeUInt8(channel[1].outputMode, 34);
    payload.writeUInt8(channel[2].outputMode, 35);
    payload.writeUInt8(channel[3].outputMode, 36);
    payload.writeUInt8(channel[4].outputMode, 37);
    payload.writeUInt8(channel[5].outputMode, 38);

    payload.writeUInt32BE(settings.device.sendInterval, 39);
    payload.writeUInt32BE(settings.device.errorInterval, 43);
    payload.writeUInt8(settings.device.maxErrorCount, 47);

    return payload;
  }

  //change output status for sending to the device and update frontend
  function alterOutputMode(userId, settings) {
    let newSettings = settings;
    for(let i = 0; i < newSettings.channel.length; i++) {
      let outputMode = newSettings.channel[i].outputMode;
      // only send 0, 1 or 2 to the device for further information see documentation
      if(outputMode >= 3 && outputMode <= 4) {
        outputMode -= 2;
        newSettings.channel[i].outputMode = outputMode;

        let data = {channel: i+1 ,mode: outputMode};
        storeOutputMode(userId, data, function(res) {
          console.log(res);
        });

        app.io.in(userId).emit('updateOutputMode', {channel: i+1, mode: outputMode});
      }
      else {
        newSettings.channel[i].outputMode = 0;
      }
    }
    return newSettings;
  }


  /* ACCOUNT RELATED CODE */

  // hash function with sha1 algorithm
  function createHash(text, salt) {
    return crypto.createHash('sha1').update(text + salt).digest('base64');
  }

  function registerUser(email, password, callback) {
    let salt = crypto.randomBytes(32);
    let account = {
      email: email,
      salt: salt,
      passwordHash: createHash(password, salt),
      cipherKey: crypto.randomBytes(16)
    };

    //fetchId
    let query = `
      select
        id
      from
        account
      where
        email = ?
    `;
    let values = [email];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return;
      }
      //checkId
      if(result.length !== 0) {
        console.log('registerUser: user already exists');
        return callback({status: 0, info: 'user already exists'});
      }
      else {
        //applyAccount
        let query = `
          insert into
            account
          set
            ?
        `;
        let values = account;
        dbConn.query(query, values, function(err, result) {
          if(err) {
            console.error(err);
            return callback({status: -1, info: err});
          }
          //applyConfiguration
          let query = `
            insert into
              configuration
              (id)
            values
              (?)
          `;
          let values = [result.insertId];
          dbConn.query(query, values, function(err, result) {
            if(err) {
              console.error(err);
              return;
            }
          });
          //applyChannels
          for(let i = 1; i <= MAX_CHANNELS; i++) {
            let query = `
              insert into
                channel
                (id, number, inputLabel, outputLabel)
              values
                (?, ?, ?, ?)
            `;
            let values = [result.insertId, i, 'Input ' + i, 'Output ' + i];
            dbConn.query(query, values, function(err, result) {
              if(err) {
                console.error(err);
                return;
              }
            });
          }
          console.log('registerUser: last insert id:', result.insertId);
          return callback({status: 1, info: 'user account registration successful'});
        });
      }
    });
  }

  function authenticate(socket, userInfo, callback) {
    if(!socket.auth) {
      let email = userInfo.email;
      let password = userInfo.password;
      verifyUser({email:email, password:password}, function(data) {
        if(data.verified) {
          socket.join(data.userId);
          console.log(`authenticate: user with id${data.userId} verified`);
          fetchOutputMode(data.userId, function(userId, data) {
            console.log(data);
            for(let i = 1; i <= data.length; i++) {
              app.io.in(userId).emit('updateOutputMode', {channel: i, mode: data[i-1]});
            }
          });
          return callback(null, true);
        }
        if(data.userId !== null) {
          return callback(new Error('wrong password'));
        }
        return callback(new Error('user not found'));
      });
    }
  }

  function verifyUser(user, callback) {
    let data = {};
    data.verified = false;
    data.userId = null;

    //fetchAccount
    let query = `
      select
        passwordHash,
        salt,
        id
      from
        account
      where
        email = ?
    `;
    let values = [user.email];
    dbConn.query(query, values, function(err, result) {
        //verify
        if(result.length === 0) {
          console.error('verifyUser: user not found');
          return callback(data);
        }
        //check Password
        let hash = createHash(user.password, result[0].salt);
        if(hash === result[0].passwordHash) {
          data.verified = true;
        }
        data.userId = result[0].id;
        return callback(data);
      }
    );
  }


  /* DB RELATED CODE */

  //load configuration and channel values from the db for the specific user
  function fetchSettings(userId, callback) {
    let settings = {};
    settings.device = {};
    settings.account = {};
    settings.channel = [];

    //fetchEmail
    let query = `
      select
        email
      from
        account
      where
        id = ?
    `;
    let values = [userId];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return;
      }
      settings.account.email = result[0].email;

      //fetchConfiguration
      let query = `
        select
          sendInterval,
          errorInterval,
          errorCount,
          notifications
        from
          configuration
        where
          id = ?
      `;
      let values = [userId];
      dbConn.query(query, values, function(err, result) {
        if(err) {
          console.error(err);
          return;
        }
        settings.device.sendInterval = result[0].sendInterval;
        settings.device.errorInterval = result[0].errorInterval;
        settings.device.errorCount = result[0].errorCount;
        settings.device.notifications = result[0].notifications;

        //fetchChannels
        let query =`
          select
            number,
            lowTriggerValue,
            highTriggerValue,
            triggerMode,
            outputMode,
            unitOffset,
            unitFactor,
            unitName,
            inputLabel,
            outputLabel,
            active
          from
            channel
          where
            id = ?
        `;
        let values = [userId];
        dbConn.query(query, values, function(err, result) {
          if(err) {
            console.error(err);
            return;
          }
          settings.channel = result.map(function(value) {
            let object = {};
            object.lowTriggerValue = value.lowTriggerValue;
            object.highTriggerValue = value.highTriggerValue;
            object.triggerMode = value.triggerMode;
            object.outputMode = value.outputMode;
            object.unitOffset = value.unitOffset;
            object.unitFactor = value.unitFactor;
            object.unitName = value.unitName;
            object.inputLabel = value.inputLabel;
            object.outputLabel = value.outputLabel;
            object.active = value.active;
            return object;
          });
          return callback(settings);
        });
      });
    });
  }

  function fetchOutputMode(userId, callback) {
    let outputMode = [];
    let query = `
      select
        outputMode
      from
        channel
      where
        id = ?
    `;
    let values = [userId];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return;
      }
      for(let i = 0; i < MAX_CHANNELS; i++) {
        outputMode[i] = result[i].outputMode;
      }
      return callback(userId, outputMode);
    });
  }

  function storeSettings(userId, settings, callback) {
    //storeConfiguration
    let query = `
      update
        configuration
      set
        ?
      where
        id = ?
    `;
    let values = [settings.device, userId];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return callback({status: -1, info: err});
      }
      //storeChannels
      let inserted = 0;
      for(let i = 1; i <= MAX_CHANNELS; i++) {
        let query = `
          update
            channel
          set
            ?
          where
            id = ? and number = ?
        `;
        let values = [settings.channel[i - 1], userId, i];
        dbConn.query(query, values, function(err, result) {
          if(err) {
            console.error(err);
            return callback({status: -1, info: err});
          }
          if (++inserted == MAX_CHANNELS) {
            return callback({status: 1, info: 'settings successful stored'});
          }
        });
      }
    });
  }

  function storeOutputMode(userId, data, callback) {
    let query = `
      update
        channel
      set
        outputMode = ?
      where
        id = ? and number = ?
    `;
    let values = [data.mode, userId, data.channel];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return callback({status: -1, info: err});
      }
      return callback({status: 1, info: 'output mode successful stored'});
    });
  }

  function fetchCipherKey(userId, callback) {
    let query = `
      select
        cipherKey
      from
        account
      where
        id = ?
    `;
    let values = [userId];
    dbConn.query(query, values, function(err, result) {
      if(err) {
        console.error(err);
        return;
      }
      return callback(result[0].cipherKey);
    });
  }


  /* FRONTEND AND SOCKET RELATED CODE */

  //redirect access from http to https
  httpApp.get("/", function (req, res) {
    res.redirect("https://" + req.headers.host + "/");
  });

  app.get("/", function (req, res) {
    res.sendFile('index.html');
  });

  //socket communication
  app.io.sockets.on('connection', function(socket) {
    let count = app.io.engine.clientsCount;
    console.log(`user connected (${count})`);

    socket.on('disconnect', function(data) {
      count = app.io.engine.clientsCount;
      console.log(`connection closed (${count})`);
    });

    socket.on('register', function(data) {
      registerUser(data.email, data.password, function(data) {
        socket.emit('register', data);
      });
    });
  });

  //put here socket communication only for logged in users
  function postAuthenticate(socket, data) {
    socket.on('receiveCipherKey', function() {
      let userId = getRoom(socket);
      fetchCipherKey(userId, function(data) {
        app.io.in(userId).emit('receiveCipherKey', data);
      });
    });

    socket.on('receiveSettings', function() {
      let userId = getRoom(socket);
      fetchSettings(userId, function(data) {
        app.io.in(userId).emit('receiveSettings', data);
      });
    });

    socket.on('storeSettings', function(data) {
      let userId = getRoom(socket);
      storeSettings(userId, data, function(res) {
        app.io.in(userId).emit('storeSettings', res);
      });
    });

    socket.on('storeOutputMode', function(data) {
      let userId = getRoom(socket);
      storeOutputMode(userId, data, function(res) {
        app.io.in(userId).emit('storeOutputMode', res);
      });
    });
  }

  //put here socket communication for all connected users
  function preAuthenticate(socket) {}

  //helperfunction to get the room of a socket its in
  function getRoom(socket) {
    return Object.keys(socket.rooms)[0];
  }

})();
