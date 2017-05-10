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

    if (this.activeNeuron !== neuron && !map.rendering) {   // only activate if not already active
      console.log(this);

        var _defaultSceneConfig = extend(true, {}, this.config.scene);
        var sceneConfig = extend(true, _defaultSceneConfig, neuron.sceneConfig);

        n.calculateScene(neuron, sceneConfig, function() {
          
          var canRenderView = false;

          if (view.visible) {
            view.hide(function() {
              view.clear(function() {
                canRenderView = true;
              });
            });
          }

          map.render(neuron, function() {
            if (typeof neuron.resource !== 'undefined') view.render(neuron);
          });
      
          // todo: centering the conscipt div without messing up the latex

          // todo: responsive type modes -> if screen is wider, resource goes to side of map; if taller, resource goes under map.
          // could either make map always a 16:9 div, centred, with a conversion between conscipt co-ords and actual on-screen co-ords
          // or could make raphael always 100% width and height, with positioning calculated accordingly, making it easier to maintain katex bits' positions.
          // then just need to programatically change the view div styling (and content styling)

          // todo: katex TITLES are in ARIAL font, but other katex (in VIEWS) is in its own font

          // show the view div and fill it with the neuron's view
          
        }); // end calculateScene

      this.activeNeuron = neuron;      
    }
  };

  // calling Conscipt(config) in browser == new Conscipt(config);
  return new Conscipt(config);
};