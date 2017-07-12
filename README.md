Particle Firmware Update
===================

This module allows you to automate the firmware release for particle photon device.

----------

How it works?
-------------

When a device becomes online, the module get notified about that, and check whether the device has the
last firmware or not; if not, the module pushes to the device the new firmware and mark the device as
updated.

#### Install

```bash
$ npm install particle-firmware-update-js --save
```

#### Initialization

```javascript

var p = require('particle-firmware-update-js');

```

#### Configuration

You can provide the configuration via your code

```javascript

p.configure({
  "token":"test",
  "firmware":"firmware2.bin",
  "firmwareLocation":"/opt/firmware",
  "dbLocation":"/opt/db/"
});

```
Also, you can override the configuration options passing the flags:

```bash

node app.js --token=<token> --firmware=firmware.bin --firmware-location=/opt/firmware

```

Or even you can use the default firmware location (./firmware):

```bash

node app.js --token=<token> --firmware=firmware.bin

```

Or even you can use the default firmware name (firmware.bin):

```bash

node app.js --token=<token> --firmware-location=/opt/firmware

```

also, the module may keep in memory (as default option) the firmware definicion and the flashing history, meaning that the data will lost on reboot. If you want to keep all the operation you have to specify the db location:

```bash

node app.js --token=<token> --db-location=/top/db/

```
And, if you need to flash a specific firmware to a specific device you can to name your firmware file with the Particle device id, asumming your device has the ID ABCDE1234ABCDE1234ABCDE1234:

```bash

ABCDE1234ABCDE1234ABCDE1234ABCDE1234.bin

```
 so you can diferentiate which firmware goes to which device.

#### Start

Start listening for events

```javascript

p.start();

```

#### Command line options

- token : (Mandatory). Your particle token associated to your account.
- firmware : (Optional. Default firmware.bin). The name of your latest firmware to flash.
- firmware-location : (Optional. Default ./firmware). The directory where the module will look for a firmware file.
- db-location : (Optional). If you specify this path, your DB will be on memory, otherwise the database will be stored in that location.

#### JSON Config options

- token : (Mandatory). Your particle token associated to your account.
- firmware : (Optional. Default firmware.bin). The name of your latest firmware to flash.
- firmwareLocation : (Optional. Default ./firmware). The directory where the module will look for a firmware file.
- dbLocation : (Optional). If you specify this path, your DB will be on memory, otherwise the database will be stored in that location.

----------

New in version 2.1.2
-------------

- Now you can target a specific firmware to a specific device


----------

New in version 2.0.1
-------------

- Now the module uses bedb as a database to keep in memory or in the file system the firmware definition and flashing history
