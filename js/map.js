// map.js - functions related to the map - create canvas, add box, etc
var Raphael = require('raphael');

var Neuron = require('./neuron');

module.exports = function(Conscipt) {


  //-----------------
  // Conscipt.Map()
  // -
  // returns a new instance of Map to be added to the Conscipt instance
  //-----------------
  Conscipt.prototype.Map = function(mapName) {
    var consciptDivId = this.config.dom.consciptDivId;
    var mapName = mapName || "map";
    var mapDivId = consciptDivId + "-" + mapName;
    return new Map(consciptDivId, mapDivId);
  };

  //-----------------
  // map constructor 
  // -
  // create div within container, create Raphael paper
  //-----------------
  function Map(containerDivId, mapDivId) {
    var self = this;

    this.divId = mapDivId;
    this.containerDivId = containerDivId;
    // add the div to the dom
    var mapDiv = document.createElement("DIV");
    mapDiv.style.display = "inline-block";
    mapDiv.style.border = "solid 3px #d4d4d4";
    mapDiv.id = this.divId;
    var containerDiv = document.getElementById(containerDivId);
    containerDiv.appendChild(mapDiv);

    // todo: abstract away registering events like this?
    window.addEventListener('resize', function() {
      self.resize();
    }, true);

    this.calculateSize();
    this.paper = Raphael(mapDivId, this.width, this.height);
  };

  //---------------------
  // Map.addNeurons(neurons)
  // -
  // Add neuron objects to map object, calculate structures
  //---------------------
  Map.prototype.addNeurons = function(neurons) {
    this.neurons = {};
    // add all neurons to Map
    for (var n in neurons) {
      this.neurons[n] = new Neuron(neurons[n]);
    }
    console.log(this.neurons);
    // add child neurons to their parents
    for (var n in this.neurons) {
      var currentNeuron = this.neurons[n];
      if (typeof currentNeuron.parent_id !== 'undefined') {
        if (typeof this.neurons[currentNeuron.parent_id].children === 'undefined') this.neurons[currentNeuron.parent_id].children = [];
        this.neurons[currentNeuron.parent_id].children.push(n);
      }
    }
    console.log(this.neurons);
  };

  //---------------------
  // Map.calculateSize()
  // -
  // updates map.width, map.height, and map.scalingFactor (does not re-render)
  //---------------------
  // calculate map size based on container div and maintaining a 16:9 ratio
  // todo: also incorporate view mode(?) - but how tf will we access that ?
  Map.prototype.calculateSize = function() {
    var containerDiv = document.getElementById(this.containerDivId);
    var width = containerDiv.offsetWidth;
    var height = containerDiv.offsetHeight;
    // if wider than 16:9 ratio, calculate width based on height
    if (((width / 16) * 9) > height) {
      this.height = height;
      this.width = (height / 9) * 16;
    } else {
    // if taller than 16:9 ratio, calculate height based on width
      this.width = width;
      this.height = (width / 16) * 9;
    }
    // scaling factor will be used to position elements on a percentage co-ords
    this.scalingFactor = this.width / 100;

    // todo: vertical positioning (center)
    // todo: incorporate view mode (i.e. if we are viewing a resource)
    // todo: incorporate view mode (i.e. portrait vs landscape, small screen)
  };

  //---------------------
  // Map.resize()
  // -
  // calculate size and then re-render paper
  //---------------------
  Map.prototype.resize = function() {
    this.calculateSize();
    this.paper.setSize(this.width, this.height);
    // todo: also rescaling content
  };

};