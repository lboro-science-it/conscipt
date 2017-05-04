// map.js - rendering scenes of neurons, maintaining canvas, etc

var Raphael = require('raphael');   // Raphael = graphic library
var dom = require('./dom');
var async = require('async');

module.exports = Map;

//----------------------
// Map(parent, mapDivId, containerDivId)
// - 
// Map constructor, creates div with mapDivId in containerDivId
// calculates map size based on containerDiv size and 16:9, creates canvas
//----------------------
function Map(parent, mapDivId, containerDivId) {
  var self = this;

  this.parent = parent;     // reference to Conscipt instance (so parent.neurons etc can be accessed)
  this.activeScene = {};    // object to store details of visible neurons to be animated from when a new scene is rendered
  this.width = 0, this.height = 0, this.widthSF = 0, this.heightSF = 0;
  this.lowestX = 0, this.greatestX = 0, this.greatestY = 0, this.lowestY = 0;
  this.connections = [];    // obj to store connections between neurons in format parent: child: 
  this.neurons = this.parent.neurons;
  this.activeNeuron = {};
  this.renderingNeuron = {};

  this.calculateSize(this.parent.div.id);

  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId,"style":{"border":"solid 1px #d4d4d4"}});

  window.addEventListener('resize', function() {
    clearTimeout(self.fireResize);  // only resize after 0.2 seconds
    self.fireResize = setTimeout(function() {self.resize();}, 200);
  }, true);

  this.canvas = Raphael(this.div, this.width, this.height);
};

//---------------------------
// Map.animateAdd(neurons, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateAdd = function(neurons, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;

  if (typeof neurons[iteration] !== 'undefined') {
    var animation = neurons[iteration];             // animation obj
    var neuronObj = self.neurons[animation.id];

    if (typeof neuronObj.parent !== 'undefined') {  // if neuron we are adding has a parent then it needs a line connecting it to it
      var from = {
        x: self.activeScene[neuronObj.parent.id].rect.attrs.x + self.activeScene[neuronObj.parent.id].rect.attrs.width / 2,
        y: self.activeScene[neuronObj.parent.id].rect.attrs.y + self.activeScene[neuronObj.parent.id].rect.attrs.height / 2
      };
      var to = {
        x: animation.x + animation.width / 2,
        y: animation.y + animation.height / 2
      };
      self.connections[neurons[iteration].id] = self.canvas.path("M" + from.x + " " + from.y).attr({stroke: animation.border}).toBack();
      self.connections[neurons[iteration].id].animate({path: "M" + from.x + " " + from.y + "L" + to.x + ", " + to.y}, 500);
    }

    self.activeScene[animation.id].rect.animate({
      "x": animation.x,
      "y": animation.y,
      "width": animation.width,
      "height": animation.height,
      "opacity": 100
    }, 500, "linear", function() {
      if (iteration + 1 == neurons.length) callback();
    });

    if (iteration + 1 < neurons.length) {
      setTimeout(function() {
        self.animateAdd(neurons, callback, iteration + 1);
      }, 100);
    }
  } else callback();
};

//---------------------------
// Map.animateMove(neurons, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateMove = function(neurons, callback, iteration) {

  if (neurons.length > 0) {
    if (typeof iteration === 'undefined') var iteration = 0;

    if (typeof neurons[iteration] !== 'undefined') {
      var animation = neurons[iteration];
      var neuronToAnimate = this.activeScene[animation.id];

      if (typeof this.connections[animation.id] !== 'undefined') {

      }

      neuronToAnimate.rect.animate({
        "x": animation.x,
        "y": animation.y,
        "width": animation.width, // todo: function to calculate width w/ SF
        "height": animation.height, // todo: put height in here!
        "fill": animation.fill
        // todo: insert code to move the neuron to its new position and size
      }, 500, "linear", function() {
        if (iteration + 1 == neurons.length) callback();  // callback only gets called when the last one is done
      });
      if (iteration + 1 < neurons.length) {
        this.animateMove(neurons, callback, iteration + 1);
      }
    }
  } else callback();
};

//------------------------
// Map.animateRemove(ids, callback, iteration)
// -
// Sequentially animate the removal of neurons, then call callback
//------------------------
Map.prototype.animateRemove = function(ids, callback, iteration) {
  if (ids.length > 0) {
    var self = this;
    if (typeof iteration === 'undefined') var iteration = 0;
    if (typeof ids[iteration] !== 'undefined') {
      var neuronToDelete = self.activeScene[ids[iteration]];  // contains the rect 
      var neuronObj = self.parent.neurons[ids[iteration]];

      if (typeof neuronObj.parent !== undefined) {  // get centre of x and y of parent, where the neuron will be animated to
        x = self.activeScene[neuronObj.parent.id].rect.attrs.x + self.activeScene[neuronObj.parent.id].rect.attrs.width / 2;
        y = self.activeScene[neuronObj.parent.id].rect.attrs.y + self.activeScene[neuronObj.parent.id].rect.attrs.height / 2;
      } else {    // simply animate the neuron to its own centre
        x = self.activeScene[neuronObj.id].rect.attrs.x;
        y = self.activeScene[neuronObj.id].rect.attrs.y;
      }

      // remove connecting lines, todo animate them out
      if (typeof self.connections[ids[iteration]] !== 'undefined') {
        self.connections[ids[iteration]].remove();
        delete self.connections[ids[iteration]];
      }

      neuronToDelete.rect.animate({
        "x": x,
        "y": y,
        "width": 0,
        "height": 0,
        "opacity": 0
      }, 500, "linear", function() {
        this.remove();      // removes the rect instance
        delete self.activeScene[ids[iteration]];
        if (iteration == ids.length - 1) callback();    // all animations are complete
      });
      // if there is another neuron to animateRemove
      if (iteration + 1 < ids.length) {
        setTimeout(function() {
          self.animateRemove(ids, callback, iteration + 1);
        }, 100);
      }
    }
  } else callback();
};

// function to iterate ancestor neurons (and their children) determining whether they need to be removed when rendering newscene, callback if so
Map.prototype.findAncestorsToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (typeof this.activeScene[neuron.id] !== 'undefined') {   // only bother if the neuron exists in the current scene
    var neuron = this.neurons[neuron.id];
    if (typeof neuron.parent !== 'undefined') {   // if neuron has an ancestor, check if it's in the scene and so may need removing
      var ancestor = neuron.parent;
      self.findChildrenToRemove(ancestor, activeNeuron, newScene, true, callback);    // todo: need to have a way to ignore neuron here
      self.findAncestorsToRemove(ancestor, ancestor, newScene, true, callback);   
    } else {  // neuron doesn't have an ancestor, if we are recursing then check if it needs animating out of scene
      if (!recursing && typeof newScene[neuron.id] === 'undefined') callback(neuron);
    }
  }
};

// function to iterate through all child neurons until finding those without children, determining whether they need to be removed and cueing it up
Map.prototype.findChildrenToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (typeof this.activeScene[neuron.id] !== 'undefined') { // only check when the neuron is in the active scene
    var neuron = this.neurons[neuron.id];  // get the neuron object of the neuron who's children we are looking for
    if (typeof neuron.children !== 'undefined') {   // if neuron has children, first check if they are in the scene and need removing
      async.each(neuron.children, function(child, nextChild) {
        // checking child.id != activeNeuron.id allows ancestorsToRemove to use this function without searching itself
        if (child.id != activeNeuron.id) self.findChildrenToRemove(child, activeNeuron, newScene, true, callback);
        nextChild();
      },
      function() {  // by this time, all children have been checked, so check if this neuron needs animating out of the scene
        if (typeof newScene[neuron.id] === 'undefined') callback(neuron);
      });
    } else {  // if neuron doesn't have children, check if it itself needs animating out of the scene - only applies when recursing (i.e. not to the original neuron)
      if (!recursing && typeof newScene[neuron.id] === 'undefined') callback(neuron); 
    }
  }
};

//------------------------
// Map.render(scene, neuron)
// -
// Animate from this.activeScene to scene, where neuron is the new active neuron
//------------------------
Map.prototype.render = function(neuron) {
  var self = this;
  var renderingNeuron = self.renderingNeuron = neuron;
  var renderingScene = renderingNeuron.scene;
  var activeNeuron = this.activeNeuron;
  this.greatestX = 0, this.lowestX = 100, this.greatestY = 0, this.lowestY = 100;
  var animations = { remove: [], anchor: [], move: [], add: [] };

  async.series([          // animation block
    function(callback) {  // check what neurons need to be removed from scene, in order
      self.findChildrenToRemove(activeNeuron, activeNeuron, renderingScene, false, function(child) {
        animations.remove.push(child.id);
      });
      callback();
    },
    function(callback) {  // check what ancestors need to be removed from the scene
      self.findAncestorsToRemove(activeNeuron, activeNeuron, renderingScene, false, function(ancestor) {
        animations.remove.push(ancestor.id);
      });
      callback();
    },
    function(callback) {  // animate the removals
      self.animateRemove(animations.remove, function() {
        callback();
      });
    },
    function(callback) {  // check what neurons need to be moved
      if (typeof activeNeuron.id !== 'undefined') {
        // calculate difference between new active neuron's position in new scene and current scene
        var activeScene = self.parent.neurons[activeNeuron.id].scene;

        var offsetX = activeScene[neuron.id].x - renderingScene[neuron.id].x;
        var offsetY = activeScene[neuron.id].y - renderingScene[neuron.id].y;

        for (var n in self.activeScene) {
          if (typeof renderingScene[n] !== 'undefined') {
            animations.anchor.push({
              id: n,
              x: ((renderingScene[n].x * self.widthSF) - ((renderingScene[n].width * self.widthSF) / 2) + offsetX * self.widthSF),
              y: ((renderingScene[n].y * self.heightSF) - ((renderingScene[n].width * self.heightSF) / 2) + offsetY * self.heightSF),
              width: (renderingScene[n].width * self.widthSF),
              height: (renderingScene[n].width * self.heightSF),
              fill: renderingScene[n].fill,
              border: renderingScene[n].border
            });
            animations.move.push({
              id: n,
              x: (renderingScene[n].x * self.widthSF) - ((renderingScene[n].width * self.widthSF) / 2),
              y: (renderingScene[n].y * self.heightSF) - ((renderingScene[n].width * self.heightSF) / 2),   // todo proper height
              width: (renderingScene[n].width * self.widthSF),
              height: (renderingScene[n].width * self.heightSF),   // todo proper height
              fill: renderingScene[n].fill,
              border: renderingScene[n].border
            });
          }
        }
      }
      callback();
    },
    function(callback) {  // move ancestors to new sizes and positions relative to new active neuron
      self.animateMove(animations.anchor, function() {
        callback();
      });
    },
    function(callback) {  // move whole structure to new position (new scene)
      self.animateMove(animations.move, function() {
        callback();
      });
    },
    function(callback) {  // create new neurons and animate them in
      for (var n in renderingScene) {
        self.updateBoundingPoints(n, renderingScene);    // keeps track of leftmost, rightmost, uppermost and lowermost co-ords

        if (typeof self.activeScene[n] === 'undefined') {
          self.activeScene[n] = {};  // activeScene[n] to store the rect
          var currentNeuron = renderingScene[n];

          var width = currentNeuron.width * self.widthSF;
          var height = currentNeuron.width * self.heightSF;  // todo: calc height based on content
          var x = (currentNeuron.x * self.widthSF) - (width / 2);
          var y = (currentNeuron.y * self.heightSF) - (height / 2);
          var fill = currentNeuron.fill || "#fff";
          var border = currentNeuron.border || "#000";

          if (currentNeuron.parent !== null) {
            x = renderingScene[currentNeuron.parent].x * self.widthSF;
            y = renderingScene[currentNeuron.parent].y * self.heightSF;
            width = 0;
            height = 0;  // todo: calc height based on content
          }

          self.activeScene[n].rect = self.canvas.rect(x, y, width, height)
            .attr({fill: fill, stroke: border, opacity: 0})
            .data("n", n)
            .click(function() {
              self.parent.activate(self.parent.neurons[this.data("n")]);
            })
            .toBack();

          width = currentNeuron.width * self.widthSF;
          height = currentNeuron.width * self.heightSF;  // todo: calc height based on content

          animations.add.push({
            id: n,
            x: (currentNeuron.x * self.widthSF) - (width / 2),
            y: (currentNeuron.y * self.heightSF) - (height / 2), // todo: height based on content
            width: width,
            height: height,  // todo: calculate based on content
            fill: fill,
            border: border
          });
        }
      }
      callback();
    },
    function(callback) {
      self.animateAdd(animations.add, function() {
        callback();
      });
    }

  ],
  function(){

  });
};

//------------------------
// Map.calculateSize(containerDivId)
// -
// calculate biggest 16:9 space based on container div (= this.parent.div.id = conscipt.div.id)
// containerDivId is optional parameter, if not passed it will try parent
//------------------------
Map.prototype.calculateSize = function(containerDivId) {
  var containerDivId = containerDivId || this.parent.div.id;
  var containerDiv = document.getElementById(containerDivId);
  var width = containerDiv.offsetWidth;
  var height = containerDiv.offsetHeight;
  if (((width / 16) * 9) > height) {  // if wider than 16:9 ratio, calculate width based on height
    this.height = height;
    this.width = (height / 9) * 16;
  } else {                            // if taller than 16:9 ratio, calculate height based on width
    this.width = width;
    this.height = (width / 16) * 9;
  }
  this.widthSF = this.width / 100;      // width scaling factor for percentage co-ords
  this.heightSF = this.height / 100;    // height scaling factor for percentage co-ords

  // todo: vertical positioning (center)
  // todo: incorporate view mode (i.e. if we are viewing a resource)
  // todo: incorporate view mode (i.e. portrait vs landscape, small screen)
};

//-------------------------
// Map.resize()
// -
// Calculate the size, resize the canvas, and then redraw the scene
//-------------------------
Map.prototype.resize = function() {
  this.calculateSize();
  this.canvas.setSize(this.width, this.height);
  this.render(this.parent.activeNeuron.scene, this.parent.activeNeuron);
  // todo: dealing with responsive?
};

Map.prototype.updateBoundingPoints = function(n, scene) {
  // keep track of the leftmost, rightmost, uppermost and lowermost bounds of the display.
  if (this.greatestX < scene[n].x + (scene[n].width / 2)) this.greatestX = scene[n].x + (scene[n].width / 2);
  if (this.lowestX > scene[n].x - (scene[n].width / 2)) this.lowestX = scene[n].x - (scene[n].width / 2);
  if (this.greatestY < scene[n].y + (scene[n].width / 2)) this.greatestY = scene[n].y + (scene[n].width / 2);  // todo: swap in the actual height
  if (this.lowestY > scene[n].y - (scene[n].width / 2)) this.lowestY = scene[n].y - (scene[n].width / 2);    // todo: swap in the actual height 
}