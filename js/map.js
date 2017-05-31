// map.js - render scenes of neurons, maintain canvas, animations, etc

var dom = require('./dom');         // for adding divs with style config etc
var n = require('./neuron');        // neuron-related functions

var async = require('async');       // async control flow, iterative loops, etc
var Raphael = require('raphael');   // Raphael = graphic library

module.exports = Map;

//----------------------
// Map(parent, mapDivId, containerDivId)
// - 
// constructor
//----------------------
function Map(parent, mapDivId, containerDivId) {
  var self = this;
  this.parent = parent;                                 // reference parent Conscipt object for accessing neurons, config, etc

  // scene state-related stuff
  this.activeScene = {}, this.activeNeuron = null;      // contains % co-ords etc for currently visible scene
  this.renderingScene = {}, this.renderingNeuron = {};  // contains % co-ords etc for currently rendering neuron / scene
  this.rendering = false;
  
  // canvas-related stuff
  this.width = 0, this.height = 0;                      // width/height = drawing area (16:9), NOT screen size or raphael canvas
  this.widthSF = 0, this.heightSF = 0;                  // scaling factor for converting percentage points of scenes to pixels
  this.viewportWidth = 0, this.viewportHeight = 0;      // viewport size + raphael canvas size - not all of which will be drawn to
  this.offsetX = 0, this.offsetY = 0;                   // (viewportWidth - width) / 2; for centring the biggest possible 16:9 space
  this.viewMode = null;                                 // "portrait or landscape"
  this.fitXSF = 1, this.fitYSF = 1;                     // scaling factor when content needs to be scaled to fit screen

  this.calculateSize(this.parent.div.id);               // sets all sizes, offsets, based on parent div size
  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId,"style":{"margin":0,"border":0}});

  // re-render on resize
  window.addEventListener('resize', function() {
    onResizeWindow(self);
  }, true);
  
  // init the Raphael canvas
  this.canvas = Raphael(this.div, this.viewportWidth, this.viewportHeight);   
};

// extend the Map prototype with animation functions
require('./map.geometry.js')(Map);
require('./map.animate.add.js')(Map);
require('./map.animate.anchor.js')(Map);
require('./map.animate.hover.js')(Map);
require('./map.animate.move.js')(Map);
require('./map.animate.remove.js')(Map);


function onResizeWindow(map) {
  if (!map.rendering) {                         // only calculate resizing if not rendering
    clearTimeout(map.fireResize);
    map.fireResize = setTimeout(function() {
      map.resize();
    }, 200);
  } else {                                      // if currently rendering, try again in 200ms
    setTimeout(function() {
      onResizeWindow(map);
    }, 200);
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

  this.viewportWidth = containerDiv.offsetWidth;    // viewportHeight and viewportWidth - make entire viewport a raphael canvas
  this.viewportHeight = containerDiv.offsetHeight;

  if (((containerDiv.offsetWidth / 16) * 9) > containerDiv.offsetHeight) {  // if wider than 16:9 ratio, calculate width based on height
    this.height = containerDiv.offsetHeight;
    this.width = (this.height / 9) * 16;
  } else {                            // if taller than 16:9 ratio, calculate height based on width
    this.width = containerDiv.offsetWidth;
    this.height = (this.width / 16) * 9;
  }

  this.widthSF = this.width / 100;      // width scaling factor for percentage co-ords
  this.heightSF = this.height / 100;    // height scaling factor for percentage co-ords

  this.offsetX = (this.viewportWidth - this.width) / 2;     // now this.offsetX and this.offsetY can be applied to keep the map centred
  this.offsetY = (this.viewportHeight - this.height) / 2;

  if (this.viewportWidth > this.viewportHeight) this.viewMode = "landscape";
  else this.viewMode = "portrait";

  // todo: incorporate view mode (i.e. if we are viewing a resource)
  // todo: incorporate view mode (i.e. portrait vs landscape, small screen)
};

// function to iterate ancestor neurons (and their children) determining whether they need to be removed when rendering newscene, callback if so
Map.prototype.findAncestorsToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (n.containsNeuron(this.activeScene, neuron)) {   // only bother if the neuron exists in the current scene
    var neuron = this.getNeuron(neuron.id);
    if (n.hasParent(neuron)) {   // if neuron has an ancestor, check if it's in the scene and so may need removing
      var ancestor = neuron.parent;
      self.findChildrenToRemove(ancestor, activeNeuron, newScene, true, callback);    // todo: need to have a way to ignore neuron here
      self.findAncestorsToRemove(ancestor, ancestor, newScene, true, callback);   
    } else {  // neuron doesn't have an ancestor, if we are recursing then check if it needs animating out of scene
      if (!recursing && !n.containsNeuron(newScene, neuron)) callback(neuron);
    }
  }
};

// iterate child neurons until childless, identifiying those which need removal (deal with in callback)
Map.prototype.findChildrenToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (n.containsNeuron(this.activeScene, neuron)) { // only check when the neuron is in the active scene
    var neuron = this.getNeuron(neuron.id);  // get the neuron object of the neuron who's children we are looking for
    if (n.hasChildren(neuron)) {   // if neuron has children, first check if they are in the scene and need removing
      async.each(neuron.children, function(child, nextChild) {
        // checking child.id != activeNeuron.id allows ancestorsToRemove to use this function without searching itself
        if (child.id != activeNeuron.id) self.findChildrenToRemove(child, activeNeuron, newScene, true, callback);
        nextChild();
      },
      function() {  // by this time, all children have been checked, so check if this neuron needs animating out of the scene
        if (!n.containsNeuron(newScene, neuron)) callback(neuron);
      });
    } else {  // if neuron doesn't have children, check if it itself needs animating out of the scene - only applies when recursing (i.e. not to the original neuron)
      if (!recursing &&  !n.containsNeuron(newScene, neuron)) callback(neuron); 
    }
  }
};

Map.prototype.getNeuron = function(neuronId) {
  return this.parent.neurons[neuronId];
};

//------------------------
// Map.render(scene, neuron)
// -
// Animate from this.activeScene to scene, where neuron is the new active neuron
//------------------------
Map.prototype.render = function(neuron, callback) {
  var self = this;
  this.renderingNeuron = neuron;
  this.renderingScene = neuron.scene;
  this.rendering = true;

  var animations = { remove: [], anchor: [], move: [], add: [] };
  var anchorGreatestX = this.width, anchorLowestX = 0, anchorGreatestY = this.height, anchorLowestY = 0;
  var sceneGreatestX = 0, sceneLowestX = this.width, sceneGreatestY = 0, sceneLowestY = this.height;

  async.series([          
    function(next) {  // check what neurons need to be removed from scene, in order starting from activeNeuron
      if (self.activeNeuron !== null) {
        self.findChildrenToRemove(self.activeNeuron, self.activeNeuron, self.renderingScene, false, function(child) {
          animations.remove.push(child.id);
        });
      }
      next();
    },
    function(next) {  // check what ancestors need to be removed from the scene in order starting from activeNeuron
      if (self.activeNeuron !== null) {
        self.findAncestorsToRemove(self.activeNeuron, self.activeNeuron, self.renderingScene, false, function(ancestor) {
          animations.remove.push(ancestor.id);
        });
      }
      next();
    },
    function(next) {  // animate the removals
      // todo: animations of stuff on screen needs to be relative to its actual position, not what we 'think' its position is
      if (animations.remove.length > 0) {
        self.animateRemove(animations.remove, function() {
          next();
        });
      } else next();
    },
    function(next) {      // find the outer points of the scene
      async.each(self.renderingScene, function(neuron, nextNeuron) {
        if (self.rX(neuron) < sceneLowestX) sceneLowestX = self.rX(neuron);
        if (self.rX(neuron) + self.rW(neuron) > sceneGreatestX) sceneGreatestX = self.rX(neuron) + self.rW(neuron);
        if (self.rY(neuron) < sceneLowestY) sceneLowestY = self.rY(neuron);
        if (self.rY(neuron) + self.rH(neuron) > sceneGreatestY) sceneGreatestY = self.rY(neuron) + self.rH(neuron);
        nextNeuron();
      }, function() {    // calculate scaling factor for when content doesn't fit viewport
        next();
      });
    },
    function(next) {  // check what neurons need to be moved
      if (self.activeNeuron !== null) {
        // calculate difference between new active neuron in active scene and new scene to create 'anchoring' animation
        var anchorOffsetX = self.aXC(neuron) - self.rXC(neuron);
        var anchorOffsetY = self.aYC(neuron) - self.rYC(neuron);

        // vars for rescaling/positioning structure when a resource is active
        var renderWidth = self.width, renderHeight = self.height, contentWidth = self.width, contentHeight = self.height;
        var xOrigin = 0, yOrigin = 0, xOffset = 0, yOffset = 0;

        if (self.renderingNeuron.resource) {     // neuron has resource, so will need to be rendered in the available space of half screen
          contentWidth = sceneGreatestX - sceneLowestX;     // instead of rendering 
          contentHeight = sceneGreatestY - sceneLowestY;
          if (self.viewMode == "landscape") {
            renderWidth = (self.viewportWidth / 2);
            xOrigin = -sceneLowestX;
            if (contentWidth < renderWidth) xOffset = (renderWidth - contentWidth) / 2;
          } else {    // portrait
            renderHeight = (self.viewportHeight / 2);
            yOrigin = -sceneLowestY;
            if (contentHeight < renderHeight) yOffset = (renderHeight - contentHeight) / 2;
          }
        }

        // calculate the mapping of for pixels ...
        var xSF = 1;
        if (contentWidth > renderWidth) {
          xSF = (renderWidth - self.scaleX(8)) / contentWidth;
          xOffset = self.scaleX(4);
        }
        var ySF = 1;
        if (contentHeight > renderHeight) {
          ySF = (renderHeight - self.scaleY(8)) / contentHeight;
          yOffset = self.scaleY(4);
        }

        async.each(self.activeScene, function(neuron, nextNeuron) {   // iterate neurons in active scene
          if (n.containsNeuron(self.renderingScene, neuron)) {        // if neuron also exists in renderingScene we need to calculate where to move it

            // set anchorOffsets to account for any neurons which would go off the screen (applied to animation in next block)
            if (self.rX(neuron) + anchorOffsetX < anchorLowestX) anchorLowestX = self.rX(neuron) + anchorOffsetX;
            if (self.rX(neuron) + self.rW(neuron) + anchorOffsetX > anchorGreatestX) anchorGreatestX = self.rX(neuron) + self.rW(neuron) + anchorOffsetX;
            if (self.rY(neuron) + anchorOffsetY < anchorLowestY) anchorLowestY = self.rY(neuron) + anchorOffsetY;
            if (self.rY(neuron) + self.rH(neuron) + anchorOffsetY > anchorGreatestY) anchorGreatestY = self.rY(neuron) + self.rH(neuron) + anchorOffsetY;

            animations.anchor.push({
              id: neuron.id,
              x: self.rX(neuron) + anchorOffsetX,
              y: self.rY(neuron) + anchorOffsetY,
              width: self.rW(neuron),
              height: self.rH(neuron)
            });

            animations.move.push({
              id: neuron.id,
              x: (xOrigin + xOffset + self.rX(neuron)) * xSF,
              y: (yOrigin + yOffset + self.rY(neuron)) * ySF,
              width: self.rW(neuron) * xSF,
              height: self.rH(neuron) * xSF
            });

            nextNeuron();
          } else nextNeuron();
        },
        function() {
          next();
        });
      } else next();
    },
    function(next) {  // move ancestors to new sizes and positions relative to new active neuron
      if (animations.anchor.length > 0) {
        var offsetX = 0, offsetY = 0;
        // apply anchor offsets to prevent rects going off screen
        if (anchorLowestX < 0) offsetX = -anchorLowestX + self.scaleX(4);
        if (anchorGreatestX > self.viewportWidth) offsetX = (self.viewportWidth - anchorGreatestX) - self.scaleX(4);
        if (anchorLowestY < 0) offsetY = -anchorLowestY + self.scaleY(4);
        if (anchorGreatestY > self.viewportHeight) offsetY = (self.viewportHeight - anchorGreatestY) - self.scaleY(4);

        self.animateAnchor(animations.anchor, offsetX, offsetY, function() {
          next();
        });
      } else next();
    },
    function(next) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        var offsetX = 0, offsetY = 0;
        self.animateMove(animations.move, offsetX, offsetY, function() {
          next();
        });
      } else next();
    },
    function(next) {  // determine which neurons need to be added to scene
      async.each(self.renderingScene, function(neuron, nextNeuron) {
        if (!n.containsNeuron(self.activeScene, neuron)) animations.add.push(neuron.id);
        nextNeuron();
      },
      function() {
        next();
      });
    },
    function(next) {    // animate adding the above neurons
      if (animations.add.length > 0) {
        self.animateAdd(animations.add, function() {
          next();
        });
      } else next();
    }
  ], function() {
    self.rendering = false;
    self.activeNeuron = neuron;
    if (callback) callback();
  });
};

//-------------------------
// Map.resize()
// -
// Calculate the size, resize the canvas, and then redraw the scene
//-------------------------
Map.prototype.resize = function() {
  this.calculateSize();
  this.canvas.setSize(this.viewportWidth, this.viewportHeight);
  this.render(this.activeNeuron);
};