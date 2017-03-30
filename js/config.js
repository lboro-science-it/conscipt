// config.js

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
        "width": 8       // width (in percent of screen)
      },
      "child": {        // child neuron of active neuron
        "depth": 1,      // depth of children (in hierarchy) to get from active
        "distance": 25, // distance distance from active
        "width": 8      // width
      },
      "ancestor": {     // ancestor of active neuron
        "depth": 2,     // depth in hierarchy (upwards) to go
        "width": 8      // width of ancestors
      },
      "zii": {          // other children of ancestors (uncles, aunts, etc)
        "depth": 1,     // how deep to go in hierarchy
        "width": 2      // how wide to draw em
      }
    },
  },
  // merge passed config with defaults
  merge: function(config) {
    var _defaults = extend(true, {}, this.defaults);
    return extend(true, _defaults, config);
  }
};