// neuron.js - stuff pertaining to neuron(s) - angles, positions, scenes, etc

var async = require('async');

var neuron = {};    // object to hold class functions

//------------------------------
// neuron.addAncestorsToScene(scene, neuron, config, callback)
// -
// add the ancestor of neuron to scene, depending on config
//------------------------------
neuron.addAncestorsToScene = function(scene, neuron, config, callback) {
  var processingNeuron = {id: neuron.id};     // keep track of the neuron we're currently processing - for multiple levels of ancestors
  var neurons = this.neurons;
  var self = this;

  // process ancestors of neuron up to depth specified in config
  var depth = config.ancestor.depth || 0;
  var currentAncestorLevel = 0;

  async.whilst(
    function() { return currentAncestorLevel < depth; },
    function(callback) {  
      var currentNeuron = neurons[processingNeuron.id];
      if (typeof currentNeuron.parent !== 'undefined') {  // get ancestor neuron of current neuron if it exists
        var ancestor = neurons[currentNeuron.parent.id];
        // distance to use depends on whether this is ancestor of an active node or not
        if (currentNeuron.id == neuron.id) var distance = config.child.distance - 2;
        else var distance = config.ancestor.distance;

        // calculate co-ords of ancestor based on its child's co-ords in the scene
        var x = self.angleDistanceX(currentNeuron.parentAngle, distance, scene[currentNeuron.id].x);
        var y = self.angleDistanceY(currentNeuron.parentAngle, distance, scene[currentNeuron.id].y);

        // add ancestor to the scene
        self.addToScene(scene, ancestor, x, y, config.ancestor.width, config.ancestor.lineHeight, "ancestor");
        self.addChildrenToScene(scene, ancestor, config.zii, "zii");

        processingNeuron.id = ancestor.id;    // process the next ancestor now
      } else {    // break if current neuron doesn't have a parent
        currentAncestorLevel = depth;
      }
      currentAncestorLevel++;
      callback();
    },
    function() {  // all ancestors are added
      callback();
    }
  );
};


//------------------------------
// neuron.addChildrenToScene(scene, neuron, sceneConfig)
// -
// Add neuron's children to scene, including calculating their positions based on angle and distance in sceneConfig
//------------------------------
// todo: instead of using children array to store position, just have a parent angle on each neuron which is used to calculate position in any scene
neuron.addChildrenToScene = function(scene, parentNeuron, sceneConfig, role) {
  var distance = sceneConfig.distance || 10;

  // todo: use callbacks here since result is required for following functions
  this.calculateChildAngles(parentNeuron);

  // add child neurons (single level for now) to the scene
  for (var i = 0; i < parentNeuron.children.length; i++) {

    var currentChild = parentNeuron.children[i];          // array related to this specific neuron, with positions
    var neuronObj = this.neurons[currentChild.id];        // actual neuron object of child

    var x = this.angleDistanceX(parentNeuron.children[i].angle, distance, scene[parentNeuron.id].x);
    var y = this.angleDistanceY(parentNeuron.children[i].angle, distance, scene[parentNeuron.id].y);
    if (role == "child") this.addToScene(scene, neuronObj, x, y, sceneConfig.width, sceneConfig.lineHeight, role);
    else this.addToScene(scene, neuronObj, x, y, sceneConfig.width, sceneConfig.height, role);
  }
}

//------------------------------
// neuron.addToScene(scene, neuron, x, y, width, height)
// -
// Adds a neuron to a scene with the given width, height, x, y
// if role == active or child, height=line height and is used to calculate proper height
// if role == ancestor or zii, height=height
//------------------------------
neuron.addToScene = function(scene, neuron, x, y, width, height, role) {
  // default config:
  var width = width || 10;
  if (role != "zii") { // active / ancestor / child
    var lineHeight = height || 4;
    var padding = 1;
    var height = lineHeight * neuron.title.length + padding;
  } else {  // zii
    var height = height || 4;
  }
  var x = x || 50;
  var y = y || 50;

  if (typeof neuron.style !== 'undefined') var style = this.styles[neuron.style]; else var style = this.styles['default'];
  if (typeof neuron.parent !== 'undefined') var parentId = neuron.parent.id; else var parentId = null;

  if (typeof scene[neuron.id] === 'undefined') scene[neuron.id] = {
    "id": neuron.id,
    "parent": parentId,
    "width": width,
    "height": height,
    "lineHeight": lineHeight,
    "x": x,
    "y": y,
    "fill": style.fill,
    "border": style["border-color"],
    "role": role
  };
}

//------------------------------
// neuron.angleDistanceX(angle, distance, x)
// -
// returns an x position given an angle, distance, and x
//------------------------------
neuron.angleDistanceX = function(angle, distance, x) {
  return Math.cos(((angle + 270) % 360) * Math.PI / 180) * distance + x;
}

//------------------------------
// neuron.angleDistanceY(angle, distance, y)
// -
// returns a y position given an angle, distance, and y
//------------------------------
neuron.angleDistanceY = function(angle, distance, y) {
  return Math.sin(((angle + 270) % 360) * Math.PI / 180) * distance + y;
}

//-------------------------------
// neuron.calculateChildAngles(neuron)
// -
// calculates (updates in neuron.children) the angles of each child
//-------------------------------
neuron.calculateChildAngles = function(neuron) {
  if (typeof neuron.calculatedChildAngles === 'undefined') {
    neuron.parentAngle = this.getParentAngle(neuron);
    var spaceInDegrees = this.getAngleBetweenChildren(neuron);
    for (var i = 0; i < neuron.children.length; i++) {    // iterate children and set angles
      if (typeof neuron.children[i].angle === 'undefined') {    // only calculate angles if not already calculated
        if (!neuron.parentAngle) neuron.children[i].angle = spaceInDegrees * i;         // if no parentAngle, distribute 360 starting at 0
        else neuron.children[i].angle = (neuron.parentAngle + 90) + spaceInDegrees * i; // if parentAngle, distribute 180 starting at parentAngle + 90
        neuron.children[i].angle %= 360;                        // keep angles within 360 range
      }
    }
    neuron.calculatedChildAngles = true;
  }
};

//------------------------------
// neuron.calculateScene(neuron, config, callback)
// -
// calculates scene of neuron based on config
//------------------------------
neuron.calculateScene = function(neuron, config, callback) {
  if (typeof neuron.scene === 'undefined') neuron.scene = {};
  // add active neuron in active position
  this.addToScene(neuron.scene, neuron, config.active.x, config.active.y, config.active.width, config.active.lineHeight, "active");
  this.addChildrenToScene(neuron.scene, neuron, config.child, "child");  // add child neurons with child config
  this.addAncestorsToScene(neuron.scene, neuron, config, function() { // add ancestor neurons with ancestor config
    callback();     // callback from when calculateScene was called
  });
};

//------------------------------
// neuron.getAngleBetweenChildren
// -
// returns the degrees between each child of neuron
//------------------------------
neuron.getAngleBetweenChildren = function(neuron) {
  if (typeof neuron.parent !== 'undefined') var degrees = 180; else var degrees = 360;
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

//------------------------------
// neuron.getParentAngle
// -
// returns angle from neuron to parent (if it has) or returns false
//------------------------------
neuron.getParentAngle = function(neuron) {
  var parentAngle = false;    // default angle when no parent (first node)
  if (typeof neuron.parent !== 'undefined') {
    // if neuron has parent, determine angle by calculating parent's child positions - recursively calculates all parents
    if (typeof neuron.parent.calculatedChildAngles === 'undefined') this.calculateChildAngles(neuron.parent);
    for (var i = 0; i < neuron.parent.children.length; i++) {
      if (neuron.parent.children[i].id == neuron.id) {
        var parentAngle = neuron.parent.children[i].angle + 180; // child angle + 180 = parent angle is reverse of child angle
        parentAngle %= 360;   // keep angles within 0-360 range
      }
    }
  }
  return parentAngle;
};

//--------------------------------
// neuron.init
// -
// updates structure of neurons, adding parent object, children arrays, and neuron ids
//--------------------------------
neuron.init = function(neurons, styles) {
  this.neurons = neurons;   // make neurons accessible by other functions here
  this.styles = styles;     // make neuron styles available here

  for (var n in neurons) {
    var currentNeuron = neurons[n];   // add id field to neuron
    currentNeuron.id = n; 
    if (typeof currentNeuron.children === 'undefined') currentNeuron.children = []; // add children array
    if (typeof currentNeuron.parent_id !== 'undefined') { // add parent object pointer if neuron has parent
      neurons[n].parent = neurons[currentNeuron.parent_id];
      // add this neuron to its parent's children array
      if (typeof currentNeuron.parent.children === 'undefined') currentNeuron.parent.children = [];
      if (typeof currentNeuron.parent.children[n] === 'undefined') currentNeuron.parent.children.push({"id": n});
    }
  }
};

module.exports = neuron;