var Bancroft = require('./bancroft.js');

var bancroft = new Bancroft();
bancroft.on('connect', function () {
  console.log('connected');
});
bancroft.on('location', function (location) {
  console.log('got new location', location);
});
bancroft.on('satellite', function (satellite) {
  console.log('got new satellite state', satellite);
});
bancroft.on('error', function (error) {
  console.log('error!', error);
});
bancroft.on('disconnect', function (err) {
  console.log('disconnected');
});
