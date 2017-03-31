// conscipt.js - all stuff about init the neuron structure, controller, etc
// todo: probably move out 'controllerish' code into a controller module
// so the only call from here might be 'controller.init' - although then accessing 'this...'

var extend = require('extend');

var defaults = require('./config');
var dom = require('./dom');
var Map = require('./map');
var View = require('./view');

module.exports = function(config) {

  function Conscipt(config) {
    this.config = defaults.merge(config);
    
    dom.init(this.config.dom);          // style <body> and <html> elems
    delete this.config.dom;

    this.div = dom.addChildDiv(this.config.div);

    this.neurons = this.config.neurons; // move neurons to main object
    delete this.config.neurons;

    addChildren(this.neurons);          // build child arrays based on parent_id
    addNeuronIds(this.neurons);         // add id of neuron to an id field within neuron
    addParents(this.neurons);           // add parent object reference to each neuron

    var mapDivId = this.div.id + "-map";
    this.map = new Map(this, mapDivId, this.div.id, this.config.scene);           // create a map instance for rendering scenes

    this.view = new View(this);

    this.activeNeuron = {};

    this.activate(this.neurons["1-1-1"]);

    // init root neuron scene
    // activate root neuron
    // == pass root neuron scene to renderer
    // == also check for resource and render if needed
    // == animate from current scene to new scene
    // == set up click events for neurons
  };

  //---------------------------
  // Conscipt.activate(neuron)
  // -
  // function called when a neuron is clicked on to make that neuron active
  // = get its scene, pass its scene to map to be rendered, make it active
  //---------------------------
  Conscipt.prototype.activate = function(neuron) {
    if (this.activeNeuron !== neuron) {
      var scene = this.getScene(neuron);  // scene = list of neurons, an active neuron has a scene
      this.map.render(scene);
      this.activeNeuron = neuron;
    }
  };

  //---------------------------
  // Conscipt.calculateChildPositions
  // -
  // ensures neuron, and all required other neurons, have their positions calculated so a scene can be composed
  // this entails finding the highest-up-the-hierarchy ancestor, calculating its parent / children positons as necessary,
  // calculating positions of grandchildren if necessary,
  // then travelling back down the chain to calculate ancestors closer to the active neuron, including uncles etc
  // and finally calculating the active neuron's child positions (based on its parent positions)
  // todo: adapt below to only calculate if they haven't already been calculated
  //---------------------------
  Conscipt.prototype.calculatePositions = function(neuron, childDepth, ancestorDepth, ziiDepth) {
    var childDepth = childDepth || 0, ancestorDepth = ancestorDepth || 0, ziiDepth = ziiDepth || 0;
    var hasParent = typeof neuron.parent_id !== 'undefined';
    if (hasParent) var parentNeuron = this.neurons[neuron.parent_id];
    var hasChildren = typeof neuron.children !== 'undefined';

    // call self with parent until reached ancestorDepth
    if (ancestorDepth > 0 && hasParent) this.calculatePositions(parentNeuron, ziiDepth, ancestorDepth - 1, ziiDepth);

    // call self with each child IF childDepth > 1 (i.e. show grandchildren)
    if (childDepth > 1 && hasChildren) for (var i = 0; i < neuron.children.length; i++) {
      var currentChild = this.neurons[neuron.children[i].id];
      this.calculatePositions(currentChild, childDepth - 1);
    }
    // once here, we know all ancestors + ancestors other children which need processing have been processed

    // process this neuron's children
    if (childDepth == 1 && hasChildren) calculateChildPositions(neuron, parentNeuron);
  };

  //---------------------------
  // Conscipt.calculateScene()
  // - 
  // called if neuron's scene needs to be calculated
  // ensure all ancestors, children, etc have positions calculated
  // then use that data to put together the scene
  //---------------------------
  Conscipt.prototype.calculateScene = function(neuron) {

    var sceneConfig = neuron.sceneConfig || this.config.scene;  // allow for neuron-specific scene config
    var ancestorDepth = sceneConfig.ancestor.depth;             // how far upwards do we want to include
    var childDepth = sceneConfig.child.depth;                   // how far downwards we want to include
    var ziiDepth = sceneConfig.zii.depth;                       // how deep within ancestor children to include children

    var scene = {};     // the object which will be returned

    if (typeof scene[neuron.id] === 'undefined') scene[neuron.id] = {   // add active neuron to scene
      "parent": neuron.parent_id || null,
      "width": sceneConfig.active.width,
      "x": sceneConfig.active.x,
      "y": sceneConfig.active.y
      // todo: calc height based on content
    };

    // ensure relevant neurons have positions calculated
    this.calculatePositions(neuron, childDepth, ancestorDepth, ziiDepth);

    // todo: in a similar style to above function, recurse through every neuron which needs to be added to the scene and add it
    // treat ancestors separately to zii, separately to children

    return scene;
  };

  //--------------------------
  // Conscipt.getScene(neuron)
  // -
  // Return the scene for this neuron being active - calculate it first if necessary
  //--------------------------
  Conscipt.prototype.getScene = function(neuron) {
    if (!neuron.calculatedScene) { 
      neuron.scene = this.calculateScene(neuron);
      neuron.calculatedScene = true;
    }
    return neuron.scene;
  };

  // make calling Conscipt(config) from the browser equivalent to = new Conscipt(config);
  return new Conscipt(config);
};

// create child arrays based on parent_id 
var addChildren = function(neurons) {
  for (var n in neurons) {
    var currentNeuron = neurons[n];
    if (typeof currentNeuron.parent_id !== 'undefined') {
      if (typeof neurons[currentNeuron.parent_id].children === 'undefined') neurons[currentNeuron.parent_id].children = [];
      if (typeof neurons[currentNeuron.parent_id].children[n] === 'undefined') neurons[currentNeuron.parent_id].children.push({"id": n});
    }
  }
};

// add an id field to within each neuron object so it can be identified when being passed around
var addNeuronIds = function(neurons) {
  for (var n in neurons) {
    var currentNeuron = neurons[n];
    currentNeuron.id = n;
  }
};

var addParents = function(neurons) {
  for (var n in neurons) {
    if (typeof neurons[n].parent_id !== 'undefined') {
      var parentNeuronId = neurons[n].parent_id;
      neurons[n].parent = neurons[parentNeuronId];
    }
  }
}

var calculateChildAngle = function(neuron) {
  if (typeof neuron.parent_id !== 'undefined') var degrees = 180; else var degrees = 360;
  var totalChildren = neuron.children.length || 0;
  var angle;      // calculate angle between each neuron
  if (totalChildren == 1) angle = degrees / 2;
  else if (totalChildren == 2) angle = degrees / 3;
  else {          // 3 or more children
    if (degrees == 360) angle = degrees / totalChildren;
    else angle = degrees / (totalChildren - 1);
  }
  return angle;
};

var calculateChildPositions = function(neuron, parentNeuron) {
  var parentAngle = calculateParentAngle(neuron, parentNeuron);
  var angle = calculateChildAngle(neuron);
  // iterate through the children, set the angle incorporating parent angle
  for (var i = 0; i < neuron.children.length; i++) {
    if (!parentAngle) neuron.children[i].angle = angle * i;         // if no parentAngle, distribute 360 starting at 0
    else neuron.children[i].angle = (parentAngle + 90) + angle * i; // if parentAngle, distribute 180 starting at parentAngle + 90
    neuron.children[i].angle %= 360;                        // keep angles within 360 range
    var plotAngle = (neuron.children[i].angle + 270) % 360; // reorient angle so 0 is at top
    // calculate the actual positions
    neuron.children[i].x = Math.cos(plotAngle * Math.PI / 180) * (25) + 50;
    neuron.children[i].y = Math.sin(plotAngle * Math.PI / 180) * (25) + 50;
  }
}

var calculateParentAngle = function(neuron, parentNeuron) {
  var parentAngle = false;    // default angle when no parent (first node)
  if (typeof neuron.parent_id !== 'undefined') {
    for (var i = 0; i < parentNeuron.children.length; i++) {
      if (parentNeuron.children[i].id == neuron.id) {
        var parentAngle = parentNeuron.children[i].angle + 180; // child angle + 180 = parent angle is reverse of child angle
        parentAngle %= 360;   // keep angles within 0-360 range
      }
    }
  }
  return parentAngle;
};