// neuron.js - neuron class definition

// Neuron class constructor
function Neuron(neuron) {
  // copy the properties of the neuron object into this instance  
  for (var thing in neuron) {
    this[thing] = neuron[thing];
  }
  // enables scene to be set manually in config
  if (typeof this.calculatedScene === 'undefined') this.calculatedScene = false;
}



// return an object consisting of neurons, positions and sizes to be shown
Neuron.prototype.getNeuronsToShow = function() {
  var neurons = [];

  neurons.push(this);
  // iterate through this neuron's children, adding them to the neuronsToShow
  if (typeof this.children !== 'undefined') var totalChildren = this.children.length; else var totalChildren = 0;
  if (typeof this.ancestors !== 'undefined') var totalAncestors = this.ancestors.length; else var totalAncestors = 0;

  for (var i = 0; i < totalChildren; i++) {
    var neuron = this.children[i];
    neurons.push(neuron);
  }
  for (var i = 0; i < totalAncestors; i++) {
    var neuron = this.ancestors[i];
    neurons.push(neuron);
  }

  return neurons;
};

module.exports = Neuron;