var spawn = require('child_process').spawn;
var util = require('util');
var events = require('events');
var fs = require('fs');
var net = require('net');
var path = require('path');
var winston = require('winston');

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
var Bancroft = function (options) {

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
      hostname : 'localhost'
  });

  events.EventEmitter.call(this);
  var self = this;

  var go = function () {

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
              'protocol' : data.proto_major
            });
          } else if (data.class === 'TPV') {
            self.location.timestamp = data.time * 1000;
            // new protocol
            // Time/date stamp in ISO8601 format, UTC. May have a fractional part of up to .001sec precision. May be absent if mode is not 2 or 3.
            var timestamp = new Date(data.time)
            if (Object.prototype.toString.call(timestamp) === "[object Date]" && !isNaN(timestamp.getTime())) {
              self.location.timestamp = timestamp.getTime()
            } else {
              /* timestamp received is in seconds */
              // this one is technically old protocol
              self.location.timestamp = data.time * 1000
            }

            /* are we moving */
            if (self.location.latitude !== data.lat || self.location.longitude !== data.lon
                || self.location.altitude !== data.alt) {
              self.location.mode = data.mode;
              self.location.ept = data.ept;
              self.location.epx = data.epx;
              self.location.epy = data.epy;
              self.location.latitude = data.lat;
              self.location.longitude = data.lon;
              self.location.altitude = data.alt;
              self.location.speed = data.speed;
              self.location.track = data.track;
              self.location.geometries.coordinates = [ data.lon, data.lat, data.alt ];
              self.emit('location', self.location);
            }

          } else if (data.class === 'SKY') {
            if (typeof data.satellites !== "undefined") { 
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

util.inherits(Bancroft, events.EventEmitter);
module.exports = Bancroft;
