var Conscipt = require('./js/conscipt');

module.exports = Conscipt;

if (typeof window !== 'undefined') {
  window.Conscipt = Conscipt;
}