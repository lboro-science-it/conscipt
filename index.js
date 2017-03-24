var Conscipt = require('./js/core');

require('./js/dom')(Conscipt);    // setup dom elements
require('./js/map')(Conscipt);    // setup map elements, manage map content
require('./js/neuron')(Conscipt); // handle neuron class
require('./js/view')(Conscipt);   // setup resource view elements, manage view content

module.exports = Conscipt;

if (typeof window !== 'undefined') {
  window.Conscipt = Conscipt;
}