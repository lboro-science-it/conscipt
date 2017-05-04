// conscipt.js - init the neuron structure, controller, etc

var defaults = require('./config'); // merge default config with passed
var dom = require('./dom');         // dom, create div, etc
var Map = require('./newMap');      // deals with rendering a scene
var n = require('./neuron');        // deals with neuron related stuff (angles, positions, etc)
var View = require('./view');       // deals with rendering a view (resource)

module.exports = function(config) {

  // Conscipt constructor
  function Conscipt(config) {
    this.config = defaults.merge(config);

    dom.init(this.config.dom);                    // init dom = style <body> and <html> elems
    this.div = dom.addChildDiv(this.config.div);  // create div if it doesn't exist in dom

    this.neurons = this.config.neurons;           // move neurons to main object
    n.init(this.neurons, this.config.styles);     // init neurons (create children arrays, parent objects, add neurons to n)

    var mapDivId = this.div.id + "-map";          // create div for map to be rendered in
    this.map = new Map(this, mapDivId, this.div.id, this.config.scene);           // create a map instance for rendering scenes

    var viewDivId = this.div.id + "-view";        // create div for view (resource) to be rendered in
    this.view = new View(this, viewDivId, this.div.id);

    this.activeNeuron = {};                      
    this.activate(this.neurons[this.config.rootNeuron]);    // initiate default view by activating the root neuron
  };

  // make neuron object the active neuron, rendering its scene (after calculating if needed)
  Conscipt.prototype.activate = function(neuron) {
    var map = this.map;

    if (this.activeNeuron !== neuron) {   // only activate if not already active
      console.log(this);
      // only calculate the scene if it needs to be calculated
      if (typeof neuron.scene === 'undefined') {
        neuron.scene = {};
        var sceneConfig = neuron.sceneConfig || this.config.scene;
        n.calculateScene(neuron, sceneConfig, function() {
          map.render(neuron);
        });
      } else {
        map.render(neuron);
      }
      this.activeNeuron = neuron;      
    }
  };

  // calling Conscipt(config) in browser == new Conscipt(config);
  return new Conscipt(config);
};