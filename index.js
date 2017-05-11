const bunyan = require('bunyan');
const request = require('request');
const Particle = require('particle-api-js');
const particle = new Particle();
const argv = require('minimist')(process.argv.slice(2));
const fs = require("fs");
const md5File = require('md5-file');
var Walker = require('walker');

var config;
var flashList = [];

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
    config = c;

    //Check for command line args to override the config
    if(argv["token"] != null) {
      config.token = argv["token"];
      log.debug("Using command line token argument");
    }
    if(argv["firmware"] != null) {
      config.firmware = argv["firmware"];
      log.debug("Using command line firmware argument");
    }
  },
  start: function() {
    if(config.token == undefined) {
      log.error("Token not present ...");
      process.exit(-1);
    }

    particle.getEventStream({ deviceId: 'mine', name:'spark/status', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        //data = online
        //deviceid = coreid
        //published_at
        if(data.data == "online") {
          //If the firmware was not set, look for the last version of it
          if(config.firmware == undefined) {
            log.debug("Firmware not set ... looking at ./firmware/firmware.bin");
            config.firmware = "./firmware/firmware.bin"
          }

          log.info("The device " + data.coreid + " is online; flashing firmware " + config.firmware);

          const hash = md5File.sync(config.firmware);
          var firmware;

          log.debug("Firmware hash " + hash);

          flashList.forEach(function(firm, idx) {
            if(firm.hash == hash) {
              firmware = firm;
            }
          });

          if(firmware == undefined) {
            log.info("Flash index " + hash + " does not exist; flashing device " + data.coreid);
            flashDevice(config.firmware, config.token, data.coreid);

            flashList.push({
              "hash": hash,
              "devices":[data.coreid]
            });
          } else {
            var device;
                //Check for each device
            firmware.devices.forEach(function(dev, idx) {
              if(dev == data.coreid) {
                device = dev;
              }
            });

            if(device == undefined) {
              log.debug("Flash index " + hash + " exists but not for this device; flashing device " + core.id);
              firmware.devices.push(data.coreid);
              flashDevice(config.firmware, config.token, data.coreid);
            } else {
              log.warn("Device " + data.coreid + " already flashed");
            }
          }
        }
      });
    });

    particle.getEventStream({ deviceId: 'mine', name:'spark/device/last_reset', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        //console.log("RESET: ", data);
      });
    });

    particle.getEventStream({ deviceId: 'mine', name:'spark/status/safe-mode', auth: config.token}).then(function(stream) {
      stream.on('event', function(data) {
        console.log("SAFE MODE: ", data);
      });
    });
  }
};

var flashDevice = function(firmware, token, device) {
  var formData = {
    file: fs.createReadStream(firmware),
    file_type: "binary"
  };
  request.put({url:'https://api.particle.io/v1/devices/' + device + '?access_token=' + token, formData: formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      log.error('Flash failed ', err);
    }
    log.info('Flash sent : ', body.status);
  });
};

var getLastFirmware = function() {
  var currentVersion = 0;
  var firmware;
  Walker('./firmware').on('file', function(file) {
    //TODO this has to be a more complex regexp
    var reg = new RegExp(".bin$");
    if(reg.test(file)) {
      var version = parseFloat(file.split("\.bin")[0].split("firmware/")[1].split("-")[1]);
      if(version > currentVersion) {
        currentVersion = version;
        firmware = file;
      }
    }
  }).on('end', function() {
    console.log("REGRESANDO " + firmware);
      return firmware;
  });
};
