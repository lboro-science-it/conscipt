// core.js - create a Conscipt class instance, init all stuff

var extend = require('extend');
var defaults = require('./config');

// constructor for a new Conscipt instance
function Conscipt(config) {
  // merge passed config with defaults
  _defaults = extend(true, {}, defaults);
  this.config = extend(true, _defaults, config);
  // run all init functions
  this.init();
}

// init everything required to display map
Conscipt.prototype.init = function() {
  this.initDom(); // setup conscipt div, style <body> and <html>
  this.map = this.Map();        // construct a map instance to display map in
  this.view = this.View();      // construct a view instance to display view in
  this.neurons = this.map.addNeurons(this.config.neurons);


  /*
  this.initResources  <- creation of resource objects
  this.initNeurons    <- calculate child/parent positions etc, create click events
  this.activate(root) <- parse through neurons calling some kind of drawNeuron etc based on this.state
  */

  // now ready to process neurons... identify root node, make it active (config overrides?)

  // activate function:
    // check for children, check for resource <- determines where to position paper
    // either way, drawing the node layout so process nodes in a foreach:
      // process title components
      // do style
      // calculate positions
      // create animation cue
      // same for children, grandchildren (recursion level?)
    // process resource content in a foreach compoent
      // process component
      // create animation cue

  // create resource rendering object - i.e. it can be passed a 'resource' array and render it

  // if active node has resources then we should be drawing it to the side and resource main
  // template dependent

  // events:
  // register onclick = make node active event
  // register other events according to component declarations (component module)
  // register onresize event which re-does the paper object, scaling factor, box size, connector size, etc
}

module.exports = Conscipt;