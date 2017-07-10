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

#### Start

Start listening for events

```javascript

p.start();

```

----------

New in version 2.0.1
-------------

- Now the module uses bedb as a database to keep in memory or in the file system the firmware definition and flashing history
