var extend = require('extend');

var defaults = require('./config');

// constructor for a new Conscipt instance with merged defaults and config
function Conscipt(config) {
  _defaults = extend(true, {}, defaults);
  this.config = extend(true, _defaults, config);
  this.init();
}

// init routines
Conscipt.prototype.init = function() {
  this.initDom();
  // todo: init Raphael

  // var paperWidth = window.innerWidth;
  // var paperHeight = window.innerHeight;
  // var paper = Raphael(0, 0, paperWidth, paperHeight);
  // todo: enforce 16:9 ratio
  // todo: enforce paper positioning (centre on screen to start?)
  // todo: detecting small screen, portrait, landscape, config options

    // create resource rendering object

  // identify root node -> make it active (can be overriden)

  // all part of making a node active 
    // active node:
    // check if node has children or a resource (either / or)

    // calculate position or use override position - how this applies to display mode?
    // process title components?
    // cue for animating (from / to)

    // child nodes:
    // do a foreach on children/grandchildren etc (depending on config depth)
    // calculate position relative to parent -> do once - or use default
    // cue for animating (from / to)

    // resource components:
    // process components
    // cue for rendering / animating

  // if active node has resources then we should be drawing it to the side and resource main
  // template dependent
  // titles use component system
  // resources also use component system

  // events:
  // register onclick = make node active event
  // register other events according to component declarations (component module)
  // register onresize event which re-does the paper object, scaling factor, box size, connector size, etc
}

module.exports = Conscipt;