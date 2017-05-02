// conscipt.js - init the neuron structure, controller, etc

var defaults = require('./config'); // merge default config with passed
var dom = require('./dom');         // dom, create div, etc
var Map = require('./map');         // deals with rendering a scene
var n = require('./neuron');        // deals with neuron related stuff (angles, positions, etc)
var View = require('./view');       // deals with rendering a view (resource)

module.exports = function(config) {

  // Conscipt constructor
  function Conscipt(config) {
    this.config = defaults.merge(config);

    // init dom for the conscipt div
    dom.init(this.config.dom);          // style <body> and <html> elems
    delete this.config.dom;
    this.div = dom.addChildDiv(this.config.div);

    // init neuron structure etc
    this.neurons = this.config.neurons; // move neurons to main object
    delete this.config.neurons;
    n.init(this.neurons, this.config.styles);               // init neurons (create children arrays, parent objects, add neurons to n)

    // create div for the map
    var mapDivId = this.div.id + "-map";
    this.map = new Map(this, mapDivId, this.div.id, this.config.scene);           // create a map instance for rendering scenes

    var viewDivId = this.div.id + "-view";
    this.view = new View(this, viewDivId, this.div.id);

    // initialise the map neuron view
    this.activeNeuron = {};
    this.activate(this.neurons[this.config.rootNeuron]);
  };

  //---------------------------
  // Conscipt.activate(neuron)
  // -
  // get neuron's scene, or calculate it first if needed, pass it to be rendered, make it active
  //---------------------------
  Conscipt.prototype.activate = function(neuron) {
    console.log(this);
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
  // calculates positions of necessary ancestors/children/zii, creates a scene object of co-ords, sizes, etc
  //---------------------------
  Conscipt.prototype.calculateScene = function(neuron) {
    var sceneConfig = neuron.sceneConfig || this.config.scene;  // get neuron specific config if exists, or global if not
    var scene = {};       // init scene object to return

    // add active neuron to scene, along with its children
    n.addToScene(scene, neuron, sceneConfig.active.x, sceneConfig.active.y, sceneConfig.active.width, sceneConfig.active.height);
    n.addChildrenToScene(scene, neuron, sceneConfig.child);

    // process ancestors (up to ancestorDepth) exactly as we did above
    var processingNeuron = {id: neuron.id};   // store current processing neuron
    for (var a = 0; a < sceneConfig.ancestor.depth; a++) {
      var currentNeuron = this.neurons[processingNeuron.id];
      if (typeof currentNeuron.parent !== 'undefined') {  // current Neuron has an ancestor - therefore we have to draw the ancestor and its children
        var ancestor = this.neurons[currentNeuron.parent.id];
        // put the ancestor the same distance away as other children if child is active node
        if (currentNeuron.id == neuron.id) var distance = sceneConfig.child.distance; else var distance = sceneConfig.ancestor.distance;

        // co-ords of ancestor are based on its child's co-ords in the scene
        var x = n.angleDistanceX(currentNeuron.parentAngle, distance, scene[currentNeuron.id].x);
        var y = n.angleDistanceY(currentNeuron.parentAngle, distance, scene[currentNeuron.id].y);

        // add the ancestor to the scene, along with its children
        // todo: account for Zii (ancestor child) depth here
        n.addToScene(scene, ancestor, x, y, sceneConfig.ancestor.width, sceneConfig.ancestor.width);
        n.addChildrenToScene(scene, ancestor, sceneConfig.zii);

        processingNeuron.id = ancestor.id;  // process the next ancestor
      } else {  // break the loop if no more ancestors
        a = sceneConfig.ancestor.depth;
      }
    }

    return scene; // scene is complete - contains active neuron, its children, and necessary levels of ancestors and their children
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