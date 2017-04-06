// config.js - defaults which get merged with whatever config is passed

var extend = require('extend');

module.exports = {
  "defaults": {
    "div": {
      "id": "conscipt",
      "style": {
        "height": "100%",
        "textAlign": "center",
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
        "width": 12       // width (in percent of screen)
      },
      "child": {        // child neuron of active neuron
        "depth": 1,      // depth of children (in hierarchy) to get from active
        "distance": 20, // distance distance from active
        "width": 8      // width
      },
      "ancestor": {     // ancestor of active neuron
        "depth": 2,     // depth in hierarchy (upwards) to go
        "distance": 14, // distance from child
        "width": 6      // width of ancestors
      },
      "zii": {          // other children of ancestors (uncles, aunts, etc)
        "depth": 1,     // how deep to go in hierarchy
        "distance": 8,
        "width": 2      // how wide to draw em
      }
    },
    "styles": {
      "default": {
        "border-color": "#000000",
        "fill": "#ffffff"
      }
    }
  },
  // merge passed config with defaults
  merge: function(config) {
    var _defaults = extend(true, {}, this.defaults);
    return extend(true, _defaults, config);
  }
};