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
    var sceneConfig = this.config.scene;
    var mapName = mapName || "map";
    var mapDivId = consciptDivId + "-" + mapName;
    return new Map(consciptDivId, mapDivId, sceneConfig);
  };

  //-----------------
  // map constructor 
  // -
  // create div within container, create Raphael paper
  //-----------------
  function Map(containerDivId, mapDivId, sceneConfig) {
    var self = this;

    this.divId = mapDivId;
    this.containerDivId = containerDivId;
    this.sceneConfig = sceneConfig;

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

  //--------------------
  // Map.activate(neuron)
  // -
  // activate a particular neuron
  //--------------------
  Map.prototype.activate = function(neuron) {
    var activatingNeuron = this.neurons[neuron];
    activatingNeuron.calculateScene(this.sceneConfig);

    // check what neurons need to be visible -> active, parents, children
    // check what position and sizes they need to be in

    // check what neurons are currently visible
    // check which currently visible neurons need to be hidden -> cue fade them out
    // cue transforms of other currently visible neurons

    // check which neurons need to be made visible -> cue fade them in
    // children animate in clockwise
    // parents are probably already visible


  // activate function:
    // check for children, check for resource <- determines where to position paper
    // either way, drawing the node layout so process nodes in a foreach:
      // process title components
      // do style
      // calculate positions
      // create animation cue
      // same for children, grandchildren (recursion level?)
    // process resource content in a foreach compoent
      // process component
      // create animation cue
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
    // add child neurons to their parents
    // todo: only add if children not already defined
    for (var n in this.neurons) {
      var currentNeuron = this.neurons[n];
      if (typeof currentNeuron.parent_id !== 'undefined') {
        if (typeof this.neurons[currentNeuron.parent_id].children === 'undefined') this.neurons[currentNeuron.parent_id].children = [];
        this.neurons[currentNeuron.parent_id].children.push(n);
      }
    }
    // todo: register click events to make each neuron active when it's clicked
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
    // SF = scaling factor, used to position elements on percentage co-ords
    this.widthSF = this.width / 100;
    this.heightSF = this.height / 100;

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