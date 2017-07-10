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

    //Always we'll look for this file, otherwise we'll look at the database
    if(argv["firmware"] != undefined ) {
      config.firmware = config.firmwareLocation + "/" + argv["firmware"];
      log.debug("Using command line firmware argument : " + argv["firmware"]);
    } else if(config.firmware != undefined) {
      config.firmware = config.firmwareLocation + "/" + config.firmware;
      log.debug("Using firmware as : " + config.firmware);
    }

    if(argv["db-location"] != null || config.dbLocation != null) {
      config.dbLocation = argv["db-location"] || config.dbLocation;
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
            console.log(config.firmware);
            const hash = md5File.sync(config.firmware);

            fetchDevice(data, config.firmware, function() {
              console.log("Found");
            });

          } else {
            db.firmware.find({}).sort({"registrationDate":1}).exec(function(err, firmwareList) {
              var len = Object.keys(firmwareList).length;

              if(len == 0) {
                log.error("No firmware found");
              } else {
                const firmware = firmwareList[0];

                fetchDevice(data, config.firmwareLocation + "/" + firmware.name, function() {
                  console.log("Found");
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

    //TODO detect when the file is removed to remove from definitions
    fs.watch(config.firmwareLocation, (eventType, filename) => {
      log.info("New firmware detected " + filename);
      if (filename) {
        db.firmware.insert({"name": filename, "version": 1, "default": true, createdAt: new Date()}, function (err, document) {
          if(err) {
            log.error("Error saving new firmware", err);
          } else {
            log.debug("Saved new firmware definition");
          }
        });
      }
    });
  }
};

var fetchDevice = function(data, firmware, callback) {
  const hash = md5File.sync(firmware);
  //Check for each device
  db.device.findOne({ device: data.coreid, firmwareHash: hash }, function (err, device) {
    if(device == undefined) {
      log.info("Device doesn't have this firmware");
      flashDevice(firmware, config.token, data.coreid, hash);
      callback();
    } else {
      log.warn("Device " + data.coreid + " already flashed");
    }
  });
};
var flashDevice = function(firmware, token, device, hash) {
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
