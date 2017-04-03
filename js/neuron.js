// neuron.js - stuff pertaining to neuron(s) - angles, positions, etc

var neuron = {};

//-------------------------------
// neuron.addChildArrays(neurons)
// -
// Adds a reference to neuron in that neuron's parent_id neuron's children array
// Or in other words, creates an array of children in all neurons referred to as parent_id
//-------------------------------
neuron.addChildArrays = function(neurons) {
  for (var n in neurons) {
    var currentNeuron = neurons[n];
    if (typeof currentNeuron.children === 'undefined') currentNeuron.children = [];
    if (typeof currentNeuron.parent_id !== 'undefined' || typeof currentNeuron.parent !== 'undefined') {
      if (typeof currentNeuron.parent !== 'undefined') var parentId = currentNeuron.parent.id; else var parentId = currentNeuron.parent_id;
      if (typeof neurons[parentId].children === 'undefined') neurons[parentId].children = [];
      if (typeof neurons[parentId].children[n] === 'undefined') neurons[parentId].children.push({"id": n});
    }
  }
};

//-------------------------------
// neuron.addNeuronIds(neurons)
// -
// adds id field to each neuron object so it can be identified when being passed around
//-------------------------------
neuron.addNeuronIds = function(neurons) {
  for (var n in neurons) {
    var currentNeuron = neurons[n];
    currentNeuron.id = n;
  }
};

//------------------------------
// neuron.addParents(neurons)
// -
// Adds pointer to the parent object of each neuron so neuron.parent can be accessed
//------------------------------
neuron.addParents = function(neurons) {
  for (var n in neurons) {
    if (typeof neurons[n].parent_id !== 'undefined') {
      var parentNeuronId = neurons[n].parent_id;
      neurons[n].parent = neurons[parentNeuronId];
      delete neurons[n].parent_id;
    }
  }
};

//-------------------------------
// neuron.calculateChildPositions(neuron)
// -
// calculates (updates in neuron.children) the angles of each child
//-------------------------------
neuron.calculateChildPositions = function(neuron, sceneConfig) {
  var sceneConfig = neuron.sceneConfig || sceneConfig;
  var x = sceneConfig.active.x;               // the x, y of the active neuron
  var y = sceneConfig.active.y;               // (i.e. the one we are calculating the children of)
  var distance = sceneConfig.child.distance;  // distance from active neuron

  if (typeof neuron.calculatedChildPositions === 'undefined') {
    neuron.parentAngle = this.getParentAngle(neuron, sceneConfig);
    var angle = this.getAngleBetweenChildren(neuron);
    // iterate through the children, set the angle incorporating parent angle
    for (var i = 0; i < neuron.children.length; i++) {
      if (typeof neuron.children[i].angle === 'undefined') {    // only calculate angles if not already calculated
        if (!neuron.parentAngle) neuron.children[i].angle = angle * i;         // if no parentAngle, distribute 360 starting at 0
        else neuron.children[i].angle = (neuron.parentAngle + 90) + angle * i; // if parentAngle, distribute 180 starting at parentAngle + 90
        neuron.children[i].angle %= 360;                        // keep angles within 360 range
      }
      if (typeof neuron.children[i].x === 'undefined' && typeof neuron.children[i].y === 'undefined') { // only calculate positions if not already calculated
        var plotAngle = neuron.children[i].angle; // reorient angle so 0 is at top
        // calculate the actual positions
        neuron.children[i].x = this.angleDistanceX(plotAngle, distance, x);
        neuron.children[i].y = this.angleDistanceY(plotAngle, distance, y);
      }
    }
    neuron.calculatedChildPositions = true;
  }
};

// return x position given an angle, distance and x
neuron.angleDistanceX = function(angle, distance, x) {
  return Math.cos(((angle + 270) % 360) * Math.PI / 180) * distance + x;
}

// return y position given angle, distance and y
neuron.angleDistanceY = function(angle, distance, y) {
  return Math.sin(((angle + 270) % 360) * Math.PI / 180) * distance + y;
}

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
neuron.getParentAngle = function(neuron, sceneConfig) {
  var parentAngle = false;    // default angle when no parent (first node)
  if (typeof neuron.parent !== 'undefined') {
    // if neuron has parent, calculate parent's child positions so we can determine parent angle (will recursively call self until reaching a neuron with no parent)
    if (typeof neuron.parent.calculatedChildPositions === 'undefined') this.calculateChildPositions(neuron.parent, sceneConfig);
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
neuron.init = function(neurons) {
  this.addChildArrays(neurons);
  this.addNeuronIds(neurons);
  this.addParents(neurons);
};

module.exports = neuron;