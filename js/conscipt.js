// conscipt.js - all stuff about init the neuron structure, controller, etc
// todo: probably move out 'controllerish' code into a controller module
// so the only call from here might be 'controller.init' - although then accessing 'this...'

var defaults = require('./config'); // merge default config with passed
var dom = require('./dom');         // dom, create div, etc
var Map = require('./map');         // deals with rendering a scene
var n = require('./neuron');        // deals with neuron related stuff (angles, positions, etc)
var View = require('./view');       // deals with rendering a view (resource)

module.exports = function(config) {

  // Conscipt constructor
  function Conscipt(config) {
    this.config = defaults.merge(config);
    dom.init(this.config.dom);          // style <body> and <html> elems
    delete this.config.dom;
    this.div = dom.addChildDiv(this.config.div);
    this.neurons = this.config.neurons; // move neurons to main object
    delete this.config.neurons;
    n.init(this.neurons);               // init neurons (create children arrays, parent objects, etc)
    var mapDivId = this.div.id + "-map";
    this.map = new Map(this, mapDivId, this.div.id, this.config.scene);           // create a map instance for rendering scenes
    this.view = new View(this);
    this.activeNeuron = {};
    this.activate(this.neurons[this.config.rootNeuron]);
  };

  //---------------------------
  // Conscipt.activate(neuron)
  // -
  // make neuron active = get its scene and pass to map to render
  //---------------------------
  Conscipt.prototype.activate = function(neuron) {
    if (typeof neuron === 'string') neuron = this.neurons[neuron];
    if (this.activeNeuron !== neuron) {
      var scene = this.getScene(neuron);  // scene = list of neurons, positions, sizes when neuron is active
      this.map.render(scene);
      this.activeNeuron = neuron;
    }
  };

  //---------------------------
  // Conscipt.calculateScene()
  // - 
  // called if neuron's scene needs to be calculated
  // ensure all ancestors, children, etc have positions calculated
  // then use that data to put together the scene
  //---------------------------

  // todo: refactor the below into helper functions (probably on the neuron module)

  Conscipt.prototype.calculateScene = function(neuron) {
    var sceneConfig = neuron.sceneConfig || this.config.scene;  // allow for neuron-specific scene config
    var ancestorDepth = sceneConfig.ancestor.depth;             // how far upwards do we want to include
    var childDepth = sceneConfig.child.depth;                   // how far downwards we want to include
    var ziiDepth = sceneConfig.zii.depth;                       // how deep within ancestor children to include children

    var scene = {};     // the object which will be returned

    if (typeof neuron.parent !== 'undefined') var parentId = neuron.parent.id; else var parentId = null;

    // add active neuron to scene
    if (typeof scene[neuron.id] === 'undefined') scene[neuron.id] = {
      "parent": parentId,
      "width": sceneConfig.active.width,
      "x": sceneConfig.active.x,
      "y": sceneConfig.active.y,
      "fill": "#d4d4d4",                    // todo: get fill based on styles
      "height": sceneConfig.active.width    // todo: calculate this based on content
    };

    // calculate neuron's childPositions, also calculates all ancestor childPositions
    n.calculateChildPositions(neuron, sceneConfig);      

    // add child neurons (single level) to the scene
    for (var i = 0; i < neuron.children.length; i++) {
      var currentChild = neuron.children[i];
      if (typeof scene[currentChild.id] === 'undefined') scene[currentChild.id] = {
        "parent": neuron.id,
        "width": sceneConfig.child.width,
        "x": currentChild.x,
        "y": currentChild.y,
        "height": sceneConfig.child.width   // todo: calc height based on content
      };
    }

    // process ancestors (up to ancestorDepth) exactly as we did above
    var processingNeuron = {
      id: neuron.id
    };
    for (var a = 0; a < ancestorDepth; a++) {
      var currentNeuron = this.neurons[processingNeuron.id];
      if (typeof currentNeuron.parent !== 'undefined') {
        // current neuron has a parent, excelletnt.
        var ancestor = this.neurons[currentNeuron.parent.id];
        // we add ancestor to the scene based on sceneConfig settings and distance from currentNeuron

        // get parent id of ancestor (if it has one) - this will be used to join children to ancestors at render stage
        if (typeof ancestor.parent !== 'undefined') var parentId = ancestor.parent.id; else var parentId = null;
        if (currentNeuron.id == neuron.id) var distance = sceneConfig.child.distance; else var distance = sceneConfig.ancestor.distance;

        // co-ords of ancestor are based on its child's co-ords in the scene
        var x = n.angleDistanceX(currentNeuron.parentAngle, distance, scene[currentNeuron.id].x);
        var y = n.angleDistanceY(currentNeuron.parentAngle, distance, scene[currentNeuron.id].y);

        if (typeof scene[ancestor.id] === 'undefined') scene[ancestor.id] = {
          "parent": parentId,
          "width": sceneConfig.ancestor.width,
          "x": x,
          "y": y,
          "height": sceneConfig.ancestor.width  // todo: calculate height based on content
        };

        n.calculateChildPositions(ancestor, sceneConfig);

        // add this ancestor's Zii's to the scene
        for (var i = 0; i < ancestor.children.length; i++) {
          var currentZii = ancestor.children[i];
          var ziiNeuron = this.neurons[currentZii.id];

          // co-ords of Zii based on Zii's parent (i.e. ancestor) position in the scene
          var x = n.angleDistanceX(ancestor.children[i].angle, sceneConfig.zii.distance, scene[ancestor.id].x);
          var y = n.angleDistanceY(ancestor.children[i].angle, sceneConfig.zii.distance, scene[ancestor.id].y);
          if (typeof scene[currentZii.id] === 'undefined') scene[currentZii.id] = {
            "parent": ancestor.id,
            "width": sceneConfig.zii.width,
            "x": x,
            "y": y,
            "height": sceneConfig.zii.width     // todo: calculate height based on whatever
          }
        }

        processingNeuron.id = ancestor.id;
      } else {
        a = ancestorDepth;
      }
    }

    return scene;
  };

  //--------------------------
  // Conscipt.getScene(neuron)
  // -
  // Return neuron's active scene, calculate first if needed
  //--------------------------
  Conscipt.prototype.getScene = function(neuron) {
    if (!neuron.calculatedScene) { 
      neuron.scene = this.calculateScene(neuron);
      neuron.calculatedScene = true;
    }
    return neuron.scene;
  };

  // calling Conscipt(config) in browser == new Conscipt(config);
  return new Conscipt(config);
};