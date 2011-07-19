var Bancroft = require('./bancroft.js');

var bancroft = new Bancroft();
bancroft.on('connect', function () {
  console.log('connected');
});
bancroft.on('location', function (location) {
  console.log('got location');
});
bancroft.on('satellite', function (location) {
  console.log('got satellite');
});
bancroft.on('disconnect', function (err) {
  console.log('disconnected');
});
