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
  this.initDom();               // setup conscipt div, style <body> and <html>
  this.map = this.Map();        // construct a map instance to display map in
  this.view = this.View();      // construct a view instance to display view in
  this.map.addNeurons(this.config.neurons);   // add the neurons from config to the map

  this.map.activate(this.config.rootNode);   // make root note the active node -> incl calculating its 'scene'

  /*
  this.initResources  <- creation of resource objects
  */

  // create resource rendering object - i.e. it can be passed a 'resource' array and render it

  // if active node has resources then we should be drawing it to the side and resource main

  // events:
  // register other events according to component declarations (component module)
}



module.exports = Conscipt;