// config.js - defaults which get merged with whatever config is passed

var extend = require('extend');

module.exports = {
  "defaults": {
    "div": {
      "id": "conscipt",
      "style": {
        "height": "100%",
        "width": "100%"
      }
    },
    "dom": {
      "body": {
        "style": {
          "background": "#fffff0",
          "height": "100%",
          "margin": "0"
        }
      },
      "documentElement": {
        "style": {
          "height": "100%"
        }
      }
    },
    "neurons": {
      "1": {
        "title": [
          "default_neuron"
        ]
      }
    },
    "rootNeuron": "1",
    "scene": {          // default scene positions, sizes
      "active": {       // for active neuron
        "x": 50,        // screen position (in percent)
        "y": 50,        // screen position (in percent)
        "lineHeight": 5,
        "width": 18       // width (in percent of screen)
      },
      "child": {        // child neuron of active neuron
        "depth": 1,      // depth of children (in hierarchy) to get from active
        "distance": 26, // distance from active
        "lineHeight": 4,
        "width": 12      // width
      },
      "ancestor": {     // ancestor of active neuron
        "depth": 2,     // depth in hierarchy (upwards) to go
        "distance": 14, // distance from child
        "lineHeight": 3,
        "width": 12      // width of ancestors
      },
      "zii": {          // other children of ancestors (uncles, aunts, etc)
        "depth": 1,     // how deep to go in hierarchy
        "distance": 11,
        "height": 4,
        "width": 4      // how wide to draw em
      }
    },
    "styles": {
      "default": {
        "border-color": "#000000",
        "fill": "#fffff0"
      }
    },
    "animations": {
      "add": {
        "interval": 100,
        "duration": 500
      },
      "remove": {
        "interval": 100,
        "duration": 500
      },
      "move": {
        "interval": 0,
        "duration": 500
      }
    }
  },
  // merge passed config with defaults
  merge: function(config) {
    var _defaults = extend(true, {}, this.defaults);
    return extend(true, _defaults, config);
  }
};