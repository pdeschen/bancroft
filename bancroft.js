var spawn = require('child_process').spawn, sys = require('sys'), events = require('events'), fs = require('fs');

var Bancroft = function (options) {
  var emitter = events.EventEmitter.call(this);
  var opts = mixin(options, {
    'port' : 2947,
    'hostname' : 'localhost'
  });
  var net = require('net');

  var serviceSocket = new net.Socket();
  serviceSocket.setEncoding('ascii');
  serviceSocket.on("data", function (payload) {

    var info = payload.split('\n');
    for ( var index = 0; index < info.length; index++) {
      if (info[index]) {
        var data = JSON.parse(info[index]);
        console.log('got', data);
        if (data.class === 'VERSION') {
          emitter.emit('connect', {
            'release' : data.release,
            'version' : data.version
          });
        } else if (data.class === 'TPV') {
          emitter.emit('location', data);
        } else if (data.class === 'SKY') {
          emitter.emit('satellite', data);
        }
      }
    }
    /* serviceSocket.write('?POLL;\n'); */

  });
  serviceSocket.on("close", function (err) {
    emitter.emit('disconnect', err);
  });

  serviceSocket.on('connect', function (socket) {
    serviceSocket.write('?WATCH={"enable":true,"json":true}\n');
    serviceSocket.write('?POLL;\n');
  });

  serviceSocket.connect(opts.port, opts.hostname);

  return this;
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

sys.inherits(Bancroft, events.EventEmitter);
module.exports = Bancroft;
