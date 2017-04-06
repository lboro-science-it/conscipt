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

  this.calculateSize(this.parent.div.id);

  // create div in dom
  this.div = dom.addChildDiv({
    "id": mapDivId,
    "parent": containerDivId,
    "style": {
      "border": "solid 1px #d4d4d4"
    }
  });

  window.addEventListener('resize', function() {
    self.resize();
  }, true);

  this.canvas = Raphael(this.div, this.width, this.height);
};

// todo: ensure all old neurons get deleted - the reference to them too etc

//------------------------
// Map.render(scene)
// -
// Compare scene to this.activeScene
// Animate out neurons, animate in new neurons, etc
//------------------------
Map.prototype.render = function(scene) {
  var self = this;

  // todo: replace animations with cueing animations and a final trigger of animations
  // so animating from place to place happens in a nice sequence

  for (var n in this.activeScene) {
    var visibleNeuron = this.activeScene[n];

    if (typeof scene[n] === 'undefined') {  // remove visible neurons that aren't in new scene
      visibleNeuron.rect.animate({
        "opacity": 0
      }, 500, "linear", function() {
        this.remove();
      });
      delete this.activeScene[n];
    } else {  // currently-visible neuron is present in new scene
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

      // todo: need to keep activeScene updated in line with scene[n] without breaking stuff.
    }
    // move currently-visible neurons to their new positions (and sizes)
  }

  // create neurons that aren't already visible
  for (var n in scene) {
    if (typeof this.activeScene[n] === 'undefined') {
      this.activeScene[n] = scene[n];
      var currentNeuron = scene[n];

                  // todo: don't create rect if it is already present!
      var width = currentNeuron.width * this.widthSF;
      var height = currentNeuron.width * this.heightSF;   // todo: calculate height based on content (elsewhere)
      var x = (currentNeuron.x * this.widthSF) - (width / 2);
      var y = (currentNeuron.y * this.heightSF) - (height / 2);
      var fill = currentNeuron.fill || "#fff";

      var rect = this.canvas.rect(x, y, width, height)
                            .attr({fill: fill})
                            .data("n", n)
                            .click(function() {
                              self.parent.activate(this.data("n"));
                            });

      this.activeScene[n].rect = rect;
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
  this.render(this.activeScene);
  // todo: dealing with responsive?
};

