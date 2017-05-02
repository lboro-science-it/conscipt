// map.js - rendering scenes of neurons, maintaining canvas, etc

var Raphael = require('raphael');   // Raphael = graphic library

var dom = require('./dom');

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
  this.animations = {};

  this.calculateSize(this.parent.div.id);

  // create div in dom
  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId,"style":{"border":"solid 1px #d4d4d4"}});

  window.addEventListener('resize', function() {
    clearTimeout(self.fireResize);  // only resize after 0.2 seconds
    self.fireResize = setTimeout(function() {self.resize();}, 200);
  }, true);

  this.canvas = Raphael(this.div, this.width, this.height);
};

//------------------------
// Map.animateRemove(ids, callback, iteration)
// -
// Sequentially animate the removal of neurons, then call callback
//------------------------
Map.prototype.animateRemove = function(ids, callback, iteration) {
  var self = this;

  if (typeof iteration === 'undefined') var iteration = 0;

  // ensure this neuron actually exists
  if (typeof ids[iteration] !== 'undefined') {
    var neuronToDelete = this.activeScene[ids[iteration]];

    neuronToDelete.rect.animate({
      "opacity": 0
    }, 500, "linear", function() {
      this.remove();      // removes the rect instance
      // delete this.activeScene[ids[iteration]];
      if (iteration + 1 == ids.length) callback();
    });
    delete this.activeScene[ids[iteration]];
    // if there is another neuron to animateRemove
    if (iteration + 1 < ids.length) {
      setTimeout(function() {
        self.animateRemove(ids, callback, iteration + 1);
      }, 100);
    }
  }
}

//------------------------
// Map.render(scene)
// -
// Animate from this.activeScene to scene
//------------------------
Map.prototype.render = function(scene) {
  var self = this;

  this.greatestX = 0, this.lowestX = 100, this.greatestY = 0, this.lowestY = 100;
  this.animations = {
    remove: [],     // store objects to be animated out
    shrink: [],     // store objects to be shrunk
    move: [],       // store objects to be moved
    add: []         // store objects to be added
  };

  // todo: animation sequencing
  // 1. remove visible neurons that are no longer present (animate furthest out children into their parents)
  // 2. move the currently active neuron to be 'docked' to its parent as its siblings are (unless it is main)
  // 3. move the whole structure so the new active neuron is centred - also resizing as necessary
  // 4. enlarge the new active neuron (probably as part of above is fine)
  // 5. animate in any required new neurons (clockwise)

  // todo: with removing visible neurons, first start at the furthest out level, animate those out, then work at the next level, animate those out, and so on.

  // check activeScene vs scene
  for (var n in this.activeScene) {
    var visibleNeuron = this.activeScene[n];

    if (typeof scene[n] === 'undefined') {
      // cue visibleNeuron to be removed if it's not present in new scene
      this.animations.remove.push(n);
    } else {  // currently-visible neuron is present in new scene, animate to place
      var width = scene[n].width * this.widthSF;
      var height = scene[n].width * this.heightSF;
      var x = (scene[n].x * this.widthSF) - (width / 2);
      var y = (scene[n].y * this.heightSF) - (height / 2);
      var fill = (scene[n].fill);

      visibleNeuron.rect.animate({
        "x": x,
        "y": y,
        "width": width, // todo: function to calculate width w/ SF
        "height": height, // todo: put height in here!
        "fill": fill
        // todo: insert code to move the neuron to its new position and size
      }, 500, "linear");

    }
    // move currently-visible neurons to their new positions (and sizes)
  }

  // animation block: callbacks prevent execution of one stage until the previous completes
  // start animating the removal neurons
  this.animateRemove(this.animations.remove, function() {
    console.log("next animation...");
  });

  // create neurons that aren't already visible
  for (var n in scene) {

    // keep track of the leftmost, rightmost, uppermost and lowermost bounds of the display.
    if (this.greatestX < scene[n].x + (scene[n].width / 2)) this.greatestX = scene[n].x + (scene[n].width / 2);
    if (this.lowestX > scene[n].x - (scene[n].width / 2)) this.lowestX = scene[n].x - (scene[n].width / 2);
    if (this.greatestY < scene[n].y + (scene[n].width / 2)) this.greatestY = scene[n].y + (scene[n].width / 2);  // todo: swap in the actual height
    if (this.lowestY > scene[n].y - (scene[n].width / 2)) this.lowestY = scene[n].y - (scene[n].width / 2);    // todo: swap in the actual height 

    if (typeof this.activeScene[n] === 'undefined') {
      this.activeScene[n] = {};  // activeScene[n] just stores the actual rect

      var currentNeuron = scene[n];

      // todo: don't create rect if it is already present!
      var width = currentNeuron.width * this.widthSF;
      var height = currentNeuron.width * this.heightSF;   // todo: calculate height based on content (elsewhere)
      var x = (currentNeuron.x * this.widthSF) - (width / 2);
      var y = (currentNeuron.y * this.heightSF) - (height / 2);
      var fill = currentNeuron.fill || "#fff";
      var border = currentNeuron.border || "#000";

      this.activeScene[n].rect = this.canvas.rect(x, y, width, height)
                            .attr({fill: fill, stroke: border})
                            .data("n", n)
                            .click(function() {
                              self.parent.activate(self.parent.neurons[this.data("n")]);
                            });
    }
  }

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

//-------------------------
// Map.resize()
// -
// Calculate the size, resize the canvas, and then redraw the scene
//-------------------------
Map.prototype.resize = function() {
  this.calculateSize();
  this.canvas.setSize(this.width, this.height);
  this.render(this.parent.activeNeuron.scene);
  // todo: dealing with responsive?
};