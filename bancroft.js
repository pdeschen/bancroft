var spawn = require('child_process').spawn, sys = require('sys'), events = require('events'), fs = require('fs'), net =
  require('net'), path = require('path'), winston = require('winston');

/**
 * gpsd client constructor. Connection with daemon is established upon object
 * 
 * creation.
 * 
 * @param options
 *            {'port': 2947, 'hostname': 'localhost'}
 * @return this with access to satellites and location properties along with
 *         EventEmitter prototypes
 */
var Bancroft =
  function (options) {

    this.satellites = {};
    /* geographic coordinate reference system (long, lat, alt) */
    this.location = {
      timestamp : 0,
      latitude : 0,
      longitude : 0,
      altitude : 0,
      speed : 0,
      geometries : {
        type : "Point",
        coordinates : [ 0.0, 0.0, 0.0 ]
      }
    };

    var opts = mixin(options, {
      port : 2947,
      hostname : 'localhost',
      gpsd : {
        spawn : true,
        device : '/dev/ttyUSB0',
        port : 2947,
        pid : '/tmp/gpsd.pid'
      }
    });

    events.EventEmitter.call(this);

    var go =
      function () {
        var self = this;

        var serviceSocket = new net.Socket();
        serviceSocket.setEncoding('ascii');
        serviceSocket.on("data", function (payload) {
          var info = payload.split('\n');
          for ( var index = 0; index < info.length; index++) {
            if (info[index]) {
              try {
                var data = JSON.parse(info[index]);
              } catch (error) {
                winston.error("bad message format", info[index], error);
                self.emit('error', {
                  message : "bad message format",
                  cause : info[index],
                  error : error
                });
                continue;
              }
              if (data.class === 'VERSION') {
                self.emit('connect', {
                  'release' : data.release,
                  'version' : data.version
                });
              } else if (data.class === 'TPV') {
                /* timestamp received is in seconds */
                self.location.timestamp = data.time * 1000;
                /* are we moving */
                if (self.location.latitude !== data.lat || self.location.longitude !== data.lon
                  || self.location.altitude !== data.alt) {
                  self.location.latitude = data.lat;
                  self.location.longitude = data.lon;
                  self.location.altitude = data.alt;
                  self.location.speed = data.speed;
                  self.location.geometries.coordinates = [ data.lon, data.lat, data.alt ];
                  self.emit('location', self.location);
                }

              } else if (data.class === 'SKY') {
                for ( var index = 0; index < data.satellites.length; index++) {
                  var satellite = data.satellites[index];
                  if (self.satellites[satellite.PRN] !== undefined) {
                    /* emit if present and new state */
                    if (self.satellites[satellite.PRN] != satellite.used) {
                      self.satellites[satellite.PRN] = satellite.used;
                      self.emit('satellite', self.satellites[satellite.PRN]);
                    }
                  } else {
                    /* emit if not present */
                    self.satellites[satellite.PRN] = satellite.used;
                    self.emit('satellite', self.satellites[satellite.PRN]);
                  }
                }

              } else if (data.class === 'ERROR') {
                winston.error('protocol error', data);
                self.emit('error', data);
              }
            }
          }
        });
        serviceSocket.on("close", function (err) {
          winston.info('socket disconnect');
          self.emit('disconnect', err);
        });

        serviceSocket.on('connect', function (socket) {
          serviceSocket.write('?WATCH={"enable":true,"json":true}\n');
          //serviceSocket.write('?POLL;\n');
        });

        serviceSocket.on('error', function (error) {
          if (error.code === 'ECONNREFUSED') {
            winston.error('socket connection refused');
            self.emit('error.connection');
          } else {
            winston.error('socket error', error);
            self.emit('error', error);
          }
        });
        serviceSocket.connect(opts.port, opts.hostname);

      };
    go.apply(this);
    this.on('error.connection', function () {
      gpsd(opts.gpsd, function () {
        go.apply(this)
      });

    });

    /* only satellites and location properties are externally visible */
    return (this);
  };
var gpsd = function (options, callback) {
  if (options.spawn) {

    path.exists(options.device, function (exists) {
      var arguments = [];
      /* fg process */
      arguments.push('-N');
      arguments.push('-P');
      arguments.push(options.pid);
      arguments.push('-S');
      arguments.push(options.port);
      arguments.push(options.device);
      var gpsd;
      var p = function (callback) {
        var self = this;
        if (self.gpsd === undefined) {
          winston.info('spawning gpsd.');
          self.gpsd = spawn('gpsd', self.arguments);
          callback.call();
          self.gpsd.on('exit', function (code) {
            winston.error('gpsd died.');
            self.gpsd = undefined;
            self.emit('error.connection');
          });
        }
      };
      if (exists) {
        p.apply(this, [ callback ]);
      } else {
        winston.info("device not found. watching device.");
        fs.watchFile(options.device, function (curr, prev) {
          winston.info("device status changed.");
          p.apply(this, [ callback ]);
        });
      }
    });

  }
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
