// neuron.js - neuron class definition

// Neuron class constructor
function Neuron(neuron) {
  // copy the properties of the neuron object into this instance  
  for (var thing in neuron) {
    this[thing] = neuron[thing];
  }
  this.calculatedScene = false;
}

// calculate the scene when this node is active
Neuron.prototype.calculateScene = function(sceneConfig) {
  // only recalculate if necessary
  if (!this.calculatedScene) {
    // position of active Neuron
    this.activePosition = {
      "x": sceneConfig.activeX,
      "y": sceneConfig.activeY
    };
    // check if parent exists
    // if so calculate angle from parent to this
    // recursively check if parent's parents exist until depth reached



    // todo: check existence of parent
    // if parent exists, determine angle from parent to child
    // this determines angle through which child nodes can be drawn
    // oh and also need to account for drawing of parent in the active scene
    // and drawing of parent's siblings in active scene (and possibly same for grandparents)
    // then, foreach child, using the new knowledge we have of how many degrees of freedom we have
    // calculate where to position each child -> angles wise
    // do some calculation to try and avoid overlapping boxes
    // save these calculations in the array
    // also consider box sizing, distance from activate
    // once all this is done once, it is done. no need to do it again.
    // we DO however need to somehow figure out which nodes are active at a given point
    // perhaps we need a pot of visible neurons and a pot of other neurons.

    this.calculatedScene = true;
  }
};

module.exports = Neuron;