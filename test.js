var Bancroft = require('./bancroft.js');

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
