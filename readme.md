## Bancroft

[bancroft](http://en.wikipedia.org/wiki/Global_Positioning_System#Bancroft.27s_method) is a [node](http://nodejs.org) client for the [gps daemon](http://catb.org/gpsd/) providing configurable async location tracking featuring [geojson](http://geojson.org/) geometries point format.

## How it works

Upon object creation ( `new Bancroft()` ), bancroft connects to a running GPS daemon and send `?WATCH` and `?POLL` messages to receive messages (json type) back from the daemon, hence, from the GPS device itself. Upon connection, a `connection` event is emitted along with daemon version and release details object. A `disconnect` event is emitted once the daemon is found off grid.

At any time, bancroft keeps track of the current location along with information about current satellite status. A `location` event is emitted once a new location has been tracked, that is, whenever the latitude, longitude or altitude received from the device differs from the currently stored information. A `satellite` event is emitted whenever a given satellite (PRN) changes status.

### Location Structure

<pre>
{ 
  timestamp: 1311296682000,
  latitude: 45.456445,
  longitude: -73.569651667,
  altitude: 28.9,
  speed: 11,
  geometries: { 
    type: 'Point',
    coordinates: [ -73.569651667, 45.456445, 28.9 ] 
  } 
}

</pre>

## Examples

<pre>
var Bancroft = require('bancroft');

var bancroft = new Bancroft();
bancroft.on('connect', function () {
  console.log('connected');
});
bancroft.on('location', function (location) {
  console.log('got new location');
});
bancroft.on('satellite', function (satellite) {
  console.log('got new satellite state');
});
bancroft.on('disconnect', function (err) {
  console.log('disconnected');
});

</pre>

## Features

* Real-time location events.
* Real-time satellite state events.
* Location data includes [geojson](http://geojson.org/) geometries `Point` format.

## ChangeLog

### 0.0.11

* remove console log

### 0.0.10

* Add undefined check (issue #9)

### 0.0.9

* Fix date parsing (@flochtililoch)
* Removed automatic gpsd spawning

### 0.0.8

* Node 0.8 support

### 0.0.7
* Port event emitting to v0.6 (eelcocramer)

### 0.0.2
* Added support for [geojson](http://geojson.org/) format as part of the location event.
* Fixed missing speed property within location event.

### 0.0.1
* Initial release

## Installation

### Requirements

This module assumes you have a working [gps daemon](http://catb.org/gpsd/) accessible somewhere reacheable on the network along with a GPS tracking device up and running. This module has been tested with an old dusty Garmin eTrex Legend with a Serial->USB adapter cable using the NMEA data protocol. More devices have been reported to work with this modules.

#### Known Compatible Devices

* Garmin eTrex Legend
* GlobalSat BU-353 

#### Mac OSX 64Bit

Support for gpsd is available from my own contribution to homebrew. However, as of this writing, pull request has yet to be merged into master.

Support for Serial-USB adapter also requires some [special sauce](http://reg88.com/?p=243). Basically,

    wget -o osx-pl2303.kext.zip "http://sourceforge.net/tracker/download.php?group_id=157692&atid=804837&file_id=363913&aid=2952982"
    unzip osx-pl2303.kext.zip
    sudo cp -r ~/osx-pl2303.kext /System/Library/Extensions/
    sudo kextload /System/Library/Extensions/osx-pl2303.kext
    sudo ln -s /dev/tty.PL2303-* /dev/ttyUSB0 

#### Testing gpsd

    $ sudo gpsd -D 2 -n -b -N -P /tmp/gpsd.pid /dev/ttyUSB0
    $ gpspipe -w

### Git Clone

    $ git clone git://github.com/pdeschen/bancroft.git

### Install from npm

    $ sudo npm install bancroft [-g]

## Todos

* Hot swap device notify should be extracted in own module with emitter
* Accumulate waypoints/route into kml?
* Add options for non-moving position differential?
* Extract message parser for better testability
* Add mocha unit test
* Automatic gpsd spawning with device hot-swapping

## License

(The MIT License)

Copyright 2011-2012 Pascal Deschenes (pdeschen @ gmail . com) . All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
