// core class instance with merged config / defaults
var Conscipt = require('./js/core');

// modules providing Conscipt functionality
require('./js/examplemodule')(Conscipt);
require('./js/dom')(Conscipt);

module.exports = Conscipt;

if (typeof window !== 'undefined') {
  window.Conscipt = Conscipt;
}