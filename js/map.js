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
    this.visibleNeurons = [];

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

    // calculates positions of neurons - also recursively calls parents until reaching ancestorDepth
    var ancestorDepth = activatingNeuron.ancestorDepth || this.sceneConfig.ancestorDepth;
    this.calculateScene(activatingNeuron, 0, ancestorDepth);
    
    var neuronsToShow = activatingNeuron.getNeuronsToShow();

    for (var n in neuronsToShow) {
      var neuronToShow = neuronsToShow[n];
      var x = neuronToShow.x * this.widthSF;
      var y = neuronToShow.y * this.heightSF;
      var width = this.sceneConfig.activeWidth * this.widthSF;
      var height = this.sceneConfig.activeWidth * this.heightSF;
      var rect = this.paper.rect(x - (width / 2), y - (height / 2), width, height);
    }
    console.log(neuronsToShow);
  };

  //---------------------
  // Map.addNeurons(neurons)
  // -
  // Add neuron objects to map object at init
  // calculate structures parent-child relationships
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
        var childNeuron = {
          "id": n
        };
        this.neurons[currentNeuron.parent_id].children.push(childNeuron);
      }
    }
    // todo: register click events to make each neuron active when it's clicked
  };

  // calculate angles to plot children of a given neuron
  Map.prototype.calculateChildPositions = function(neuron) {
    // distance between child and active Neuron
    var childDistance = neuron.childDistance || this.sceneConfig.childDistance;

    // todo: incorporate angle from parent to child in calculating angles
    // if no parent, children can be plotted 360 around active, otherwise 180 centred reverse to parent
    if (typeof neuron.parent_id === 'undefined') var degrees = 360; else var degrees = 180;
    if (typeof neuron.children !== 'undefined') var totalChildren = neuron.children.length; else var totalChildren = 0;

    // single child gets placed half way around arc
    if (totalChildren == 1) {
      neuron.children[0].angle = degrees / 2;
    } else 
    // pair of children get placed a third and two thirds around arc
    // todo: when 360, they should end up at 90 and 270, thats (360 / 4) and (360 / 4) * 3 -> so we are working with some kind of how many quarters of the screen are we working with number
    if (totalChildren == 2) {
      neuron.children[0].angle = degrees / 3;
      neuron.children[1].angle = (degrees / 3) * 2;
    } else {    // 3 or more children get evenly distributed around the arc
      if (degrees == 360) var spacer = degrees / totalChildren;
      else var spacer = degrees / (totalChildren - 1);
      for (var i = 0; i < totalChildren; i++) neuron.children[i].angle = i * spacer;
    }

    // calculate the actual x, y positions of the children
    for (var i = 0; i < totalChildren; i++) {
      neuron.children[i].angle += 270;
      if (neuron.children[i].angle > 360) neuron.children[i].angle -= 360;

      neuron.children[i].x = Math.cos(neuron.children[i].angle * Math.PI / 180) * (childDistance) + neuron.x;
      neuron.children[i].y = Math.sin(neuron.children[i].angle * Math.PI / 180) * (childDistance) + neuron.y;
    }
  };

  //---------------------
  // Map.calculateScene(neuron, iteration, depth)
  // -
  // calculates positions, sizes, etc of a particular neuron's scene
  // recurses through parents iteration number of times until reaching depth
  //---------------------
  Map.prototype.calculateScene = function(neuron, iteration, depth) {
    if (!neuron.calculatedScene) {
      // set active position of neuron
      neuron.x = this.sceneConfig.activeX;
      neuron.y = this.sceneConfig.activeY;

      // todo: enable more than 1 level of children displaying
      // var childDepth = this.childDepth || this.sceneConfig.childDepth;
            
      // recursively calculate all the ancestor scenes we need
      if (typeof neuron.parent_id !== 'undefined') {        // if this has a parent
        // if depth is set then we are currently recursively calculating parent scenes
        var ancestorDepth = neuron.ancestorDepth || this.sceneConfig.ancestorDepth;
        if (typeof depth !== 'undefined') ancestorDepth = depth;    // now depth is set correctly
        if (typeof iteration !== 'undefined') var iteration = iteration + 1; else var iteration = 0;
        var parentNeuron = this.neurons[neuron.parent_id];
        this.calculateScene(parentNeuron, iteration, ancestorDepth);
      }
      // calculates positions of the (single layer) of child Neurons of this Neuron
      this.calculateChildPositions(neuron);
      neuron.calculatedScene = true;
    }
  }

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