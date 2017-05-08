// conscipt.js - init the neuron structure, controller, etc

var defaults = require('./config'); // merge default config with passed
var dom = require('./dom');         // dom, create div, etc
var Map = require('./map');      // deals with rendering a scene
var n = require('./neuron');        // deals with neuron related stuff (angles, positions, etc)
var View = require('./view');       // deals with rendering a view (resource)

var extend = require('extend');

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
    var view = this.view;

    if (this.activeNeuron !== neuron) {   // only activate if not already active
      console.log(this);

      // only calculate the scene if it needs to be calculated
//      if (typeof neuron.scene === 'undefined') {
//        neuron.scene = {};
        var _defaultSceneConfig = extend(true, {}, this.config.scene);
        var sceneConfig = extend(true, _defaultSceneConfig, neuron.sceneConfig);

        n.calculateScene(neuron, sceneConfig, function() {
          map.render(neuron, function() {
            // check if the neuron has a view
            if (typeof neuron.resource === 'undefined') {
              view.clearAndHide();
              // hide the view div
            } else {
              view.render(neuron.resource);
              // so here we want to move the canvas to the left 
              //map.canvas.setViewBox(map.lowestX * map.widthSF, 0, map.width, map.height);

              // in fact, we don't want to bother about the canvas at all here that must be part of the animations
              // e.g. IF has a resource, animate in a specific way based on lowestX, greatestX etc
              // IF not, animate as currently
              // perhaps instead of dealing with viewBox, just animate everything to the left if it has a resource,
              // so determine a centre position for the neuron based on the total size of the thing and stick the whole scene there in the 
              // second part of the animations
              // this of course will also enable us a little control over whether things go off the edge, etc
              // so we could write a routine which, when animating the left-most, top-most, bottom-most or right-most, prevents the x or y going lower than 0
              // since these moves consist of preparing an entire array, we can record the lowest x position during creation of it, and then offset everything by that amount if necessary to keep it over 0 (the anchor animation)
              // todo also: we need to keep 3rd level children closer to their ancestors. so currently ancestors are just plotted at child 'distance' in the code. 'ancestor' distance is used for the ... dunno. but we need to fix especially for narrower screen

              // todo: not sure about small screen actually without refactoring whole thing
              // todo: centering the conscipt div without messing up the latex

              // show the view div and fill it with the neuron's view
            }
          });
        });
//      } else {
//        map.render(neuron);
//      }

      this.activeNeuron = neuron;      
    }
  };

  // calling Conscipt(config) in browser == new Conscipt(config);
  return new Conscipt(config);
};