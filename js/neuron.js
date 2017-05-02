// neuron.js - stuff pertaining to neuron(s) - angles, positions, etc

var neuron = {};

//------------------------------
// neuron.addChildrenToScene(scene, neuron, sceneConfig)
// -
// Add neuron's children to scene, including calculating their positions based on angle and distance in sceneConfig
//------------------------------
// todo: instead of using children array to store position, just have a parent angle on each neuron which is used to calculate position in any scene
neuron.addChildrenToScene = function(scene, parentNeuron, sceneConfig, fill) {
  var distance = sceneConfig.distance || 10;
  var fill = fill || "#ffffff";

  this.calculateChildAngles(parentNeuron);

  // add child neurons (single level for now) to the scene
  for (var i = 0; i < parentNeuron.children.length; i++) {

    var currentChild = parentNeuron.children[i];          // array related to this specific neuron, with positions
    var neuronObj = this.neurons[currentChild.id];        // actual neuron object of child

    var x = this.angleDistanceX(parentNeuron.children[i].angle, distance, scene[parentNeuron.id].x);
    var y = this.angleDistanceY(parentNeuron.children[i].angle, distance, scene[parentNeuron.id].y);

    this.addToScene(scene, neuronObj, x, y, sceneConfig.width, sceneConfig.width, fill);
  }
}

//------------------------------
// neuron.addToScene(scene, neuronId, x, y, width, height)
// -
// Adds a neuron to a scene with the given width, height, x, y
//------------------------------
neuron.addToScene = function(scene, neuron, x, y, width, height, fill) {
  // default config:
  var width = width || 10;
  var height = height || 10;
  var x = x || 50;
  var y = y || 50;
  if (typeof neuron.style !== 'undefined') var style = this.styles[neuron.style]; else var style = this.styles['default'];

  if (typeof neuron.parent !== 'undefined') var parentId = neuron.parent.id; else var parentId = null;

  if (typeof scene[neuron.id] === 'undefined') scene[neuron.id] = {
    "parent": parentId,
    "width": width,
    "height": height,
    "x": x,
    "y": y,
    "fill": style.fill,
    "border": style["border-color"]
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
    var angle = this.getAngleBetweenChildren(neuron);
    // iterate through the children, set the angle incorporating parent angle
    for (var i = 0; i < neuron.children.length; i++) {
      if (typeof neuron.children[i].angle === 'undefined') {    // only calculate angles if not already calculated
        if (!neuron.parentAngle) neuron.children[i].angle = angle * i;         // if no parentAngle, distribute 360 starting at 0
        else neuron.children[i].angle = (neuron.parentAngle + 90) + angle * i; // if parentAngle, distribute 180 starting at parentAngle + 90
        neuron.children[i].angle %= 360;                        // keep angles within 360 range
      }
    }
    neuron.calculatedChildAngles = true;
  }
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
    // if neuron has parent, calculate parent's child positions so we can determine parent angle (will recursively call self until reaching a neuron with no parent)
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

    // add children array to neuron
    if (typeof currentNeuron.children === 'undefined') currentNeuron.children = [];
    if (typeof currentNeuron.parent_id !== 'undefined') {

      // add pointer to parent object to neuron, remove 'parent_id'
      neurons[n].parent = neurons[currentNeuron.parent_id];
      delete neurons[n].parent_id;

      // add this neuron to its parent's children array
      if (typeof currentNeuron.parent.children === 'undefined') currentNeuron.parent.children = [];
      if (typeof currentNeuron.parent.children[n] === 'undefined') currentNeuron.parent.children.push({"id": n});
    }
  }
};

module.exports = neuron;