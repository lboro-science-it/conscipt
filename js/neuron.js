// neuron.js - neuron class definition

// Neuron class constructor
function Neuron(neuron) {
  // copy the properties of the neuron object into this instance
  for (var thing in neuron) {
    this[thing] = neuron[thing];
  }
}


module.exports = Neuron;