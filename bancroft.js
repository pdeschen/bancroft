var spawn = require('child_process').spawn, sys = require('sys'), events = require('events'), fs = require('fs'), net =
  require('net');

/**
 * gpsd client constructor. Connection with daemon is established upon object
 * creation.
 * 
 * @param options
 *            {'port': 2947, 'hostname': 'localhost'}
 * @return this with access to satellites and location properties along with
 *         EventEmitter prototypes
 */
var Bancroft = function (options) {
  this.satellites = {};
  /* geographic coordinate reference system (long, lat, alt) */
  this.location = {
    latitude : 0,
    longitude : 0,
    altitude : 0,
    speed : 0,
    geometry : {
      "type" : "Point",
      "coordinates" : [ 0.0, 0.0, 0.0 ]
    }
  };

  (function () {
    var emitter = events.EventEmitter.call(this);
    var opts = mixin(options, {
      'port' : 2947,
      'hostname' : 'localhost'
    });
    var serviceSocket = new net.Socket();
    serviceSocket.setEncoding('ascii');
    serviceSocket.on("data", function (payload) {
      var info = payload.split('\n');
      for ( var index = 0; index < info.length; index++) {
        if (info[index]) {
          var data = JSON.parse(info[index]);
          if (data.class === 'VERSION') {
            emitter.emit('connect', {
              'release' : data.release,
              'version' : data.version
            });
          } else if (data.class === 'TPV') {

            location.time = data.time;
            /* are we moving */
            if (location.latitude !== data.lat || location.longitude !== data.lon || location.altitude !== data.alt) {
              location.latitude = data.lat;
              location.longitude = data.lon;
              location.altitude = data.alt;
              location.speed = data.speed;
              location.geometries.coordinates = [ data.lon, data.lat, data.alt ];
              emitter.emit('location', location);
            }

          } else if (data.class === 'SKY') {
            for ( var index = 0; index < data.satellites.length; index++) {
              var satellite = data.satellites[index];

              if (satellites[satellite.prn]) {
                /* emit if present and new state */
                if (satellites[satellite.prn] != satellite.used) {
                  satellites[satellite.prn] = satellite.used;
                  emitter.emit('satellite', satellites[satellite.prn]);
                }
              } else {
                /* emit if not present */
                satellites[satellite.prn] = satellite.used;
                emitter.emit('satellite', satellites[satellite.prn]);
              }
            }

          } else if (data.class === 'ERROR') {
            emitter.emit('error', data);
          }
        }
      }
    });
    serviceSocket.on("close", function (err) {
      emitter.emit('disconnect', err);
    });

    serviceSocket.on('connect', function (socket) {
      serviceSocket.write('?WATCH={"enable":true,"json":true}\n');
      serviceSocket.write('?POLL;\n');
    });

    serviceSocket.connect(opts.port, opts.hostname);
  }).call(this);

  /* only satellites and location properties are externally visible */
  return (this);
};

var mixin = function (source, destination) {

  if (typeof (source) == "object") {
    for ( var prop in source) {
      if ((typeof (source[prop]) == "object") && (source[prop] instanceof Array)) {
        if (destination[prop] === undefined) {
          destination[prop] = [];
        }
        for ( var index = 0; index < source[prop].length; index += 1) {
          if (typeof (source[prop][index]) == "object") {
            if (destination[prop][index] === undefined) {
              destination[prop][index] = {};
            }
            destination[prop].push(mixin(source[prop][index], destination[prop][index]));
          } else {
            destination[prop].push(source[prop][index]);
          }
        }
      } else if (typeof (source[prop]) == "object") {
        if (destination[prop] === undefined) {
          destination[prop] = {};
        }
        mixin(source[prop], destination[prop]);
      } else {
        destination[prop] = source[prop];
      }
    }
  }

  return destination;
};

/* get prototype chain */
sys.inherits(Bancroft, events.EventEmitter);
module.exports = Bancroft;
