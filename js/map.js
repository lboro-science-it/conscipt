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

  this.parent = parent;
  this.activeScene = {};    // object to store details of visible neurons to be animated from when a new scene is rendered
  this.width = 0, this.height = 0, this.widthSF = 0, this.heightSF = 0;

  this.calculateSize(this.parent.div.id);

  // create div in dom
  this.div = dom.addChildDiv({
    "id": mapDivId,
    "parent": containerDivId,
    "style": {
      "display": "inline-block",
      "border": "solid 3px #d4d4d4"
    }
  });

  window.addEventListener('resize', function() {
    self.resize();
  }, true);

  this.canvas = initCanvas(this.div, this.width, this.height);
};

//------------------------
// Map.render(scene)
// -
// Compare scene to this.activeScene
// Animate out neurons, animate in new neurons, etc
//------------------------
Map.prototype.render = function(scene) {


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
Map.prototype.resize = function() {
  this.calculateSize();
  resizeCanvas(this);
  // todo: also rescaling content
  // todo: dealing with responsive?
};

//----------------------
// Raphael functions
// -
// functions which depend on Raphael library - i.e. if we change from Raphael these are what we need to change
//----------------------
var initCanvas = function(div, width, height) {
  return Raphael(div, width, height);
};

var resizeCanvas = function(map) {
  map.canvas.setSize(map.width, map.height);
};