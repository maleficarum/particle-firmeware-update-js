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

You have to provide the particle token for yout account and the firmware location/name.

```javascript

p.configure({
  "token":"test",
  "firmware":"firmware2.bin"
});

```
Also, you can override the configuration options passing the flags:

```bash

node app.js --token=<token> --firmware=./firmware.bin

```

Or even you can use the default firmware location (./firmware/firmware.bin):

```bash

node app.js --token=<token>

```

#### Start

For listening for events you have to

```javascript

p.start();

```
