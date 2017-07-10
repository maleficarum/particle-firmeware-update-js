/**
* author : maleficarum [ maleficarum.mx ]
*/

const bunyan = require('bunyan');
const request = require('request');
const Particle = require('particle-api-js');
const particle = new Particle();
const argv = require('minimist')(process.argv.slice(2));
const fs = require("fs");
const md5File = require('md5-file');
const Datastore = require('nedb');

var config;
var flashList = [];
var db = {};

const FIRMWARE_LOCATION = './firmware';
const FIRMWARE_NAME = "firmware.bin";

const log = bunyan.createLogger({
  name: "ParticleFirmwareUpdater",
  src: false,
  streams: [
    {
      level:'debug',
      stream: process.stdout
    }
  ]
});

module.exports = {
  configure: function(c) {
    config = c || {};

    //Check for command line args to override the config
    if(config.token == undefined) {
      if(argv["token"] == undefined) {
        log.error("Token not present ...");
        process.exit(-1);
      } else {
        config.token = argv["token"];
      }
    }

    if(argv["firmware-location"] != undefined) {
      config.firmwareLocation = argv["firmware-location"];
      log.info("Using command line firmware location argument : " + config.firmwareLocation);
    } else {
      config.firmwareLocation = FIRMWARE_LOCATION;
      log.info("Using default firmware location as " + config.firmwareLocation);
    }

    //Verify if the firmware location exists.
    try {
      fs.statSync(config.firmwareLocation);
    } catch(e) {
      log.warn("Creating " + config.firmwareLocation + " cause doesn't exist");
      fs.mkdirSync(config.firmwareLocation);
    }

    //Always we'll look for this file, otherwise we'll look at the database
    if(argv["firmware"] != undefined ) {
      config.firmware = argv["firmware"];
    }

    log.info("Using firmware " + config.firmware);

    if(argv["db-location"] != null || config.dbLocation != null) {
      config.dbLocation = argv["db-location"] || config.dbLocation;

      //Verify if the firmware location exists.
      try {
        fs.statSync(config.dbLocation);
      } catch(e) {
        log.warn("Creating " + config.dbLocation + " cause doesn't exist");
        fs.mkdirSync(config.dbLocation);
      }

      db.device = new Datastore({ filename: config.dbLocation + "/device.db", autoload: true });
      db.firmware = new Datastore({ filename: config.dbLocation + "/firmware.db", autoload: true });
      log.info("Creating a persistent store in " + config.dbLocation);

    } else {
      log.info("Creating a in-memory database");
      db.device = new Datastore();
      db.firmware = new Datastore();
    }
  },
  start: function() {

    particle.getEventStream({ deviceId: 'mine', name:'spark/status', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        if(data.data == "online") {
          log.info("The device " + data.coreid + " is online");

          //If the firmware name is defined we're going to use it
          if(config.firmware != undefined) {
            config.firmware = FIRMWARE_NAME;
            fetchDevice(data, config.firmware, function() {
              //console.log("Found custom");
            });

          } else {
            db.firmware.find({}).sort({"registrationDate":1}).exec(function(err, firmwareList) {
              var len = Object.keys(firmwareList).length;

              if(len == 0) {
                log.error("No firmware found");
              } else {
                const firmware = firmwareList[0];

                fetchDevice(data, firmware.name, function() {
                  //console.log("Found registrered");
                });
              }
            });
          }
        }
      });
    });

    particle.getEventStream({ deviceId: 'mine', name:'spark/device/last_reset', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        log.debut("Device reset: ", data);
      });
    });

    particle.getEventStream({ deviceId: 'mine', name:'spark/status/safe-mode', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        log.debug("Device in safe mode: ", data);
      });
    });

    fs.watch(config.firmwareLocation, (eventType, filename) => {
      const path = config.firmwareLocation + "/" + filename;

      fs.stat(path, function(err, stat) {
        if(err) {//The firmware doesn't exist anymore
          db.firmware.remove({ "name": filename }, { multi: true }, function (err, numRemoved) {
            log.info("Removed " + numRemoved + " firmware definitions");
          });
        } else {
          if(stat.isDirectory()) {
            log.debug("New directory created " + filename);
            return;
          }
          log.info("New firmware detected " + filename);
          const hash = md5File.sync(path);

          //Check whether is the same firmware or it's different even with the same name
          db.firmware.findOne({ "name": filename, "hash":hash }, function (err, device) {
            if(device) {
              log.warn("The firmware " + path + " already exists in the database.")
            } else {
              db.firmware.insert({"name": filename, "hash":hash, "version": 1, "default": true, createdAt: new Date()}, function (err, document) {
                if(err) {
                  log.error("Error saving new firmware", err);
                } else {
                  log.debug("Saved new firmware definition");
                }
              });
            }
          });
        }
      });
    });
  }
};

var fetchDevice = function(data, firmware, callback) {
  var path = config.firmwareLocation + "/" + data.coreid + ".bin";

  fs.stat(path, function(err, stat) {
    if(err) {
      path = config.firmwareLocation + "/" + firmware;
    }

    const hash = md5File.sync(path);
    //Check for each device
    db.device.findOne({ device: data.coreid, firmwareHash: hash }, function (err, device) {
      if(device == undefined) {
        log.info("Device doesn't have this firmware");
        flashDevice(path, config.token, data.coreid, hash);
        callback();
      } else {
        log.warn("Device " + data.coreid + " already flashed");
      }
    });
  });
};

var flashDevice = function(firmware, token, device, hash) {

  log.info("Flashing device " + device + " with firmware " + firmware);

  var flashProcess = particle.flashDevice({ deviceId: device, files: { file1: firmware }, auth: token });

  flashProcess.then(function(data) {
    db.device.insert({"device": device, flashedAt: new Date(), firmwareHash: hash}, function (err, document) {
      if(err) {
        log.error("Error saving device flash process ", err);
      } else {
        log.info('Device flashing started successfully ', data);
      }
    });
  }, function(err) {
    log.error('An error occurred while flashing the device ', err);
  });
};
