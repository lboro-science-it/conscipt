// map.js - render scenes of neurons, maintain canvas, animations, etc

var dom = require('./dom');         // for adding divs with style config etc
var n = require('./neuron');        // neuron-related functions

var async = require('async');       // async control flow, iterative loops, etc
var extend = require('extend');     // Is in fact only used when adding neuron to active scene - todo: consider removal
var Raphael = require('raphael');   // Raphael = graphic library
var katex = require('katex');       // LaTeX rendering library

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

  this.connections = [];    // obj to store connections (paths) between neurons
  
  this.calculateSize(this.parent.div.id);               // sets all sizes, offsets, based on parent div size
  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId});

  // re-render on resize
  window.addEventListener('resize', function() {
    clearTimeout(self.fireResize);  // only resize after 0.2 seconds
    self.fireResize = setTimeout(function() {self.resize();}, 200);
  }, true);
  
  // init the Raphael canvas
  this.canvas = Raphael(this.div, this.viewportWidth, this.viewportHeight);   
};

//----------------------------
// Map.ah(neuron), Map.aw(neuron), Map.ax(neuron), Map.ay(neuron)
// -
// Return neuron height, width, x, y (in % of drawing area) in the active scene
//----------------------------
Map.prototype.ah = function(neuron) {
  return this.activeScene[neuron.id].height;
};
Map.prototype.aw = function(neuron) {
  return this.activeScene[neuron.id].width;
};
Map.prototype.ax = function(neuron) {
  return this.activeScene[neuron.id].x;
};
Map.prototype.ay = function(neuron) {
  return this.activeScene[neuron.id].y;
};

//---------------------------
// Map.animateAdd(neurons, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateAdd = function(neurons, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;
  var neuron = self.getNeuron(neurons[iteration]);     // neuron object, use to check if it has a parent, so we know how to animate it in
  self.activeScene[neuron.id] = extend(true, {}, self.renderingScene[neuron.id]);  // clone the details from renderingScene (co-ords, etc)
  
  self.animateAddRect(neuron, function() {            // animate the rect in
    self.animateAddTitle(neuron);                     // once rect is in, animate the title in
    if (iteration + 1 == neurons.length && typeof callback === 'function') callback();  // once final rect is added, callback
  });

  self.animateAddConnector(neuron);

  if (iteration + 1 < neurons.length) {               // still neurons to animate, move to the next iteration
    setTimeout(function() {
      self.animateAdd(neurons, callback, iteration + 1);
    }, self.parent.config.animations.add.interval);
  }

  //----------
  // STUFF RE: CONNECTION LINE
  //----------
/*
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
*/
};

Map.prototype.animateAddConnector = function(neuron, callback) {
  if (n.hasParent(neuron)) {  // only add connector if neuron has a parent
    console.log("here we are animating adding connector");
    var parent = neuron.parent;

    var border = this.parent.config.styles[neuron.style]["border-color"] || "#000";
    var borderWidth = this.parent.config.styles.default["border-width"] || 3;
    console.log(this.parent.config.styles[neuron.style]["border-color"]);
    
    var fromX = this.scaleX(this.rx(parent)) + this.offsetX;    // from centre point of parent rect in rendering scene - parent will be in position by now
    var fromY = this.scaleY(this.ry(parent)) + this.offsetY;
    var toX = this.getRenderingX(neuron) + this.getRenderingWidth(neuron) / 2;    // to centre of own rect in rendering scene
    var toY = this.getRenderingY(neuron) + this.getRenderingHeight(neuron) / 2;

    console.log("fromX: " + fromX + ", fromY: " + fromY + ", toX: " + toX + ", toY: " + toY);

    this.connections[neuron.id] = this.canvas.path("M" + fromX + " " + fromY)
    .attr({
      "stroke": border,
      "stroke-width": borderWidth
    })
    .toBack();
    this.connections[neuron.id].animate({path: "M" + fromX + " " + fromY + "L" + toX + ", " + toY}, 500);
  }

  if (typeof callback === 'function') callback();
};

//--------------------
// Map.animateAddRect(neuron) 
// -
// Draws neuron at its parent or its own origin then animates it to its new position.
//--------------------
Map.prototype.animateAddRect = function(neuron, callback) {
  var self = this;
  var startingX = this.getOriginX(neuron);
  var startingY = this.getOriginY(neuron);

  this.activeScene[neuron.id].rect = this.canvas.rect(startingX, startingY, 0, 0)
  .attr({
    "fill": self.renderingScene[neuron.id].fill,
    "stroke": self.renderingScene[neuron.id].border,
    "stroke-width": self.parent.config.styles.default["border-width"],      // todo; make this settable via styles..
    "opacity": 1
  })
  .toBack()
  .animate({
    "x": self.getRenderingX(neuron),
    "y": self.getRenderingY(neuron),
    "width": self.getRenderingWidth(neuron),
    "height": self.getRenderingHeight(neuron)
  }, self.parent.config.animations.add.duration, "linear", function() {  // by here, rect is animated into place
    self.raphOnClickActivate(this, neuron);
    // todo: deal with tabindex stuff
    // self.activeScene[neuron.id].rect[0].tabIndex = 0;
    if (typeof callback === 'function') callback();
  });
};

//--------------------
// Map.animateAddTitle(neuron)
// -
// iterate rows in a title of neuron object, animates to canvas, adds a reference to canvas object to activeScene
//--------------------
Map.prototype.animateAddTitle = function(neuron) {
  var self = this;
  var rectCentreX = this.getRenderingX(neuron) + this.getRenderingWidth(neuron) / 2;    // x px centre of rendering neuron rect
  var rectTopY = this.getRenderingY(neuron);                                  // y px top of rendering neuron rect
  var lineHeight = this.renderingScene[neuron.id].lineHeight;                 // height (percent) of each text line for current neuron
  this.activeScene[neuron.id].title = [];

  async.eachOf(neuron.title, function(row, index, nextRow) {        // iterate parts of title
    var y = rectTopY + self.scaleY(index * lineHeight + 0.5 + lineHeight / 2);    // calc position for current row based on lineHeight and a 0.5 padding
    var fontSize = self.scaleY(lineHeight) / 2;

    if (typeof row === "string") {                // create svg text element for strings in array
      var type = "string";
      var textContent = row;                      // svg text element will contain the content
    } else if (typeof row === "object") {         // process object enabling custom title types
      var type = Object.keys(row)[0];
      var textContent = "";                       // svg text element will be empty but used for animations etc
      var customContent = row[type];              // custom content will be overlaid onto svg element
    }

    var titleObj = {                              // object to keep track of raphael objects / divs for a given neuron
      "text": self.canvas.text(rectCentreX, y, textContent)
      .attr({
        "font-size": fontSize,
        "opacity": 0
      })
    };

    if (type == "latex") {
      var latexElem = dom.addChildDiv({           // create div for latex to be rendered into with same style as other text
        "id": neuron.id + "-title-" + index,
        "style": {
          "cursor": "pointer",
          "fontSize": fontSize + "px",
          "opacity": "0",
          "position": "absolute"
        }
      });

      latexElem.innerHTML = katex.renderToString(customContent);
      latexElem.addEventListener('click', function() {      // activate neuron's scene on click
        self.parent.activate(self.getNeuron(neuron.id));
      });

      setTimeout(function() {   // ensure latexElem content is fully rendered (width is correct) before positioning it
        latexElem.style.top = y - latexElem.offsetHeight / 2 + "px";
        latexElem.style.left = rectCentreX - latexElem.offsetWidth / 2 + "px";
      }, 100);

      eve.on('raphael.anim.frame.' + titleObj.text.id, onAnimate = function(index) {   // use dummy elem animation to animate latex div
        latexElem.style.opacity = this.attrs.opacity;
      });
      titleObj.div = latexElem;
    }

    self.activeScene[neuron.id].title.push(titleObj);
    
    titleObj.text.animate({
      "opacity": 1
    }, self.parent.config.animations.add.duration, "linear", function() {
      if (type == "string") self.raphOnClickActivate(this, neuron);
      if (type == "latex") eve.unbind('raphael.anim.frame.' + titleObj.text.id, onAnimate);
    });
  });
};

//---------------------------
// Map.animateMove(animations, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateMove = function(animations, offsetX, offsetY, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;

  var neuronAnimation = animations[iteration];                  // animation object, containing co-ords etc
  var neuron = this.activeScene[neuronAnimation.id];            // actual neuron object that is being dealt with
  this.updateActiveSceneNeuronProperties(neuronAnimation.id);   // update co-ords of neuron in activeScene to match those in renderingScene

  //----------
  // TITLES
  //----------
  async.eachOf(neuron.title, function(row, index, nextRow) {
    var fontSize = row.text.attrs["font-size"]
    if (neuron.role == "zii") {      // hide ZII neuron titles
      if (typeof row.div !== 'undefined') {
        eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {     // animating latex div moves
          row.div.style.opacity = this.attrs.opacity;
          row.div.style.left = (this.attrs.x - row.div.offsetWidth / 2) + "px";   // subtract half width to get left co-ord
          row.div.style.top = (this.attrs.y - row.div.offsetHeight / 2) + "px";   // subtract half height to get top co-ord
        });
      }

      row.text.animate({                                                          // animating moving raphael elements
        "opacity": 0,
        "x": neuronAnimation.x + offsetX + (neuronAnimation.width / 2),           // add half width to get centre co-ord
        "y": neuronAnimation.y + offsetY + (neuronAnimation.height / 2)           // add half height to get centre co-ord
      }, self.parent.config.animations.move.duration, "linear", function() {
        if (typeof row.div !== 'undefined') eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
      });

      // todo: set up here so that on hover the title shows

    } else {    // active, ancestor or child neurons get their titles animated to new position of rect
      if (typeof row.div !== 'undefined') {
        eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
          row.div.style.opacity = this.attrs.opacity;
          row.div.style.left = (this.attrs.x - row.div.offsetWidth / 2) + "px";
          row.div.style.top = (this.attrs.y - row.div.offsetHeight / 2) + "px"; 
          row.div.style.fontSize = this.attrs["font-size"] + "px";
        });
      }

      // stuff used for positioning titles that remain visible
      var x = neuronAnimation.x + (neuronAnimation.width / 2);
      var rectTopY = neuronAnimation.y;
      var lineHeight = (neuronAnimation.height / neuron.title.length) - 1;
      var y = (rectTopY + (index * lineHeight) + 0.5 + (lineHeight / 2));

      row.text.animate({
        "x": x + offsetX,
        "y": y + offsetY,
        "font-size": lineHeight / 2,
        "opacity": 1
      }, self.parent.config.animations.move.duration, "linear", function() {
        if (typeof row.div !== 'undefined') eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
      });
    }

    nextRow();
  });

  neuron.rect.animate({
    "x": neuronAnimation.x + offsetX,
    "y": neuronAnimation.y + offsetY,
    "width": neuronAnimation.width, 
    "height": neuronAnimation.height
  }, self.parent.config.animations.move.duration, "linear", function() {
    if (iteration + 1 == animations.length && typeof callback === 'function') callback();  // callback only gets called when the last one is done
  });

  if (iteration + 1 < animations.length) {
    this.animateMove(animations, offsetX, offsetY, callback, iteration + 1);
  }
};

//------------------------
// Map.animateRemove(neurons, callback, iteration)
// -
// Sequentially animate the removal of neurons, then call callback
//------------------------
Map.prototype.animateRemove = function(neurons, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;
  var neuron = self.getNeuron(neurons[iteration]);     // neuron object of neuron to delete

  this.animateRemoveTitle(neuron, function() {
    self.animateRemoveRect(neuron, function() {         // only remove the rect once the title animation completes
      if (iteration == neurons.length - 1 && typeof callback === 'function') callback();  // callback once the last neuron rect remove has been animated
    });
  });

  if (iteration + 1 < neurons.length) {                 // call next animateRemove for next neuron that needs removing
    setTimeout(function() {
      self.animateRemove(neurons, callback, iteration + 1);
    }, self.parent.config.animations.remove.interval);
  }
};

Map.prototype.animateRemoveRect = function(neuron, callback) {
  var self = this;
  var neuronSceneObj = this.activeScene[neuron.id];
  
  var x = self.getOriginX(neuron, "active");      // we are gonna remove it either to its parent's co-ords, or its own co-ords if it doesn't have a parent
  var y = self.getOriginY(neuron, "active");

  neuronSceneObj.rect.animate({
    "x": x,
    "y": y,
    "width": 0,
    "height": 0,
    "opacity": 0
  }, self.parent.config.animations.remove.duration, "linear", function() {
    this.remove();
    delete self.activeScene[neuron.id];
    if (typeof callback === 'function') callback();
  });
};

// iterates the rows in a neuron's title object
Map.prototype.animateRemoveTitle = function(neuron, callback) {
  var self = this;
  var neuronSceneObj = this.activeScene[neuron.id];
  async.eachOf(neuronSceneObj.title, function(row, index, nextRow) {      // iterate title rows
    var isLatex = (typeof row.div !== 'undefined');               // if row has a div it's latex so must be animated out along with raphael elem
    if (isLatex) {
      eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
        row.div.opacity = this.attrs.opacity;                     // the raphael dummy elem will fade its opacity, div matches
      });
    }
    row.text.animate({                                            // row.text = raphael elem of this title row
      "opacity": 0
    }, self.parent.config.animations.remove.duration, "linear", function() {
      if (isLatex) {
        eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
        row.div.parentNode.removeChild(row.div);
      }
      this.remove();
      delete neuronSceneObj.title[index];
      if (index == neuronSceneObj.title.length - 1) nextRow();            // only move to callback once final animation is complete
    });
    if (index < neuronSceneObj.title.length - 1) nextRow();               // go directly to next row until final row
  }, function() {
    if (typeof callback === 'function') callback();
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

Map.prototype.getActiveHeight = function(neuron) {
  return this.scaleY(this.ah(neuron));
};

Map.prototype.getActiveWidth = function(neuron) {
  return this.scaleX(this.aw(neuron));
};

Map.prototype.getActiveX = function(neuron) {
  return this.scaleX(this.ax(neuron) - this.aw(neuron) / 2) + this.offsetX;
};

Map.prototype.getActiveY = function(neuron) {
  return this.scaleY(this.ay(neuron) - this.ah(neuron) / 2) + this.offsetY;
};

Map.prototype.getNeuron = function(neuronId) {
  return this.parent.neurons[neuronId];
};

// returns either the centre of the parent (if a neuron has a parent) or the centre of own final position
Map.prototype.getOriginX = function(neuron, scene) {
  var neuron = neuron.parent || neuron;
  var scene = scene || "rendering";
  if (scene == "rendering") return this.getRenderingX(neuron) + this.getRenderingWidth(neuron) / 2;
  else return this.getActiveX(neuron) + this.getActiveWidth(neuron) / 2;
};

// return either centre of parent, or centre of own position if no parent
Map.prototype.getOriginY = function(neuron, scene) {
  var neuron = neuron.parent || neuron;
  var scene = scene || "rendering";
  if (scene == "rendering") return this.getRenderingY(neuron) + this.getRenderingHeight(neuron) / 2;
  else return this.getActiveY(neuron) + this.getActiveHeight(neuron) / 2;
};

Map.prototype.getRenderingHeight = function(neuron) {
  return this.scaleY(this.rh(neuron));
};

// 
Map.prototype.getRenderingWidth = function(neuron) {
  return this.scaleX(this.rw(neuron));
};

// convert a neuron's percentage co-ordinates in a rendering scene
Map.prototype.getRenderingX = function(neuron) {
  return this.scaleX(this.rx(neuron) - this.rw(neuron) / 2) + this.offsetX;
};

// convert a neuron's percentage y co-ord to its rendering position
Map.prototype.getRenderingY = function(neuron) {
  return this.scaleY(this.ry(neuron) - this.rh(neuron) / 2) + this.offsetY;
};

// register click handler for a raphael object to activate a neuron + set cursor
Map.prototype.raphOnClickActivate = function(raphaelObj, neuron) {
  var self = this;
  raphaelObj.data("neuronId", neuron.id)
  .click(function() {
    self.parent.activate(self.getNeuron(this.data("neuronId")));
  })
  .hover(function() {
    this.attr({"cursor": "pointer"});
  }, function() {
    this.attr({"cursor": "normal"});
  });
};

// height of neuron in rendering scene in percentage
Map.prototype.rh = function(neuron) {
  return this.renderingScene[neuron.id].height;
};

// width of neuron in rendering scene in percentage
Map.prototype.rw = function(neuron) {
  return this.renderingScene[neuron.id].width;
};

// x of neuron in rendering scene in percentage
Map.prototype.rx = function(neuron) {
  return this.renderingScene[neuron.id].x;
};

// y of neuron in rendering scene in percentage
Map.prototype.ry = function(neuron) {
  return this.renderingScene[neuron.id].y;
};

// function that takes a percentage x (as defined in neuron scenes) and returns the position based on scaling factor
Map.prototype.scaleX = function(x) {
  return x * this.widthSF;
};

// return y co-ord based on scaling factor based on height of screen
Map.prototype.scaleY = function(y) {
  return y * this.heightSF;
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
      if (animations.remove.length > 0) {
        self.animateRemove(animations.remove, function() {
          next();
        });
      } else next();
    },
    function(next) {  // check what neurons need to be moved
      if (self.activeNeuron !== null) {
        // calculate difference between new active neuron's position in new scene and current scene
        var sceneOffsetX = self.scaleX(self.ax(self.renderingNeuron) - self.rx(self.renderingNeuron));
        var sceneOffsetY = self.scaleY(self.ay(self.renderingNeuron) - self.ry(self.renderingNeuron));

        // offset = difference between new active node's position in the current scene and its position in the new scene (centre co-ordinates)

        async.each(self.activeScene, function(neuron, nextNeuron) {
          if (n.containsNeuron(self.renderingScene, neuron)) {   // if neuron exists in activeScene and renderingScene, it needs to be moved
            animations.anchor.push({
              id: neuron.id,
              x: self.getRenderingX(neuron) + sceneOffsetX ,
              y: self.getRenderingY(neuron) + sceneOffsetY,
              width: self.getRenderingWidth(neuron),
              height: self.getRenderingHeight(neuron)
            });

            // track any of the neurons which have gone beyond the edge of the canvas, which will be used to offset when animating moves
            if (self.getRenderingX(neuron) + sceneOffsetX < anchorLowestX) anchorLowestX = self.getRenderingX(neuron) + sceneOffsetX;
            if (self.getRenderingX(neuron) + self.getRenderingWidth(neuron) + sceneOffsetX > anchorGreatestX) anchorGreatestX = self.getRenderingX(neuron) + self.getRenderingWidth(neuron) + sceneOffsetX;
            if (self.getRenderingY(neuron) + sceneOffsetY < anchorLowestY) anchorLowestY = self.getRenderingY(neuron) + sceneOffsetY;
            if (self.getRenderingY(neuron) + self.getRenderingHeight(neuron) + sceneOffsetY > anchorGreatestY) anchorGreatestY = self.getRenderingY(neuron) + self.getRenderingHeight(neuron) + sceneOffsetY;

            animations.move.push({
              id: neuron.id,
              x: self.getRenderingX(neuron),
              y: self.getRenderingY(neuron),
              width: self.getRenderingWidth(neuron),
              height: self.getRenderingHeight(neuron)
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

        var anchorOffsetX = 0, anchorOffsetY = 0;
        // apply anchor offsets to prevent rects going off screen
        if (anchorLowestX < 0) anchorOffsetX = -anchorLowestX + self.scaleX(4);
        if (anchorGreatestX > self.viewportWidth) anchorOffsetX = (self.viewportWidth - anchorGreatestX) - self.scaleX(4);
        if (anchorLowestY < 0) anchorOffsetY = -anchorLowestY + self.scaleY(4);
        if (anchorGreatestY > self.viewportHeight) anchorOffsetY = (self.viewportHeight - anchorGreatestY) - self.scaleY(4);

        self.animateMove(animations.anchor, anchorOffsetX, anchorOffsetY, function() {
          next();
        });
      } else next();
    },
    function(next) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        var moveOffsetX = 0;
        var moveOffsetY = 0;
        self.animateMove(animations.move, moveOffsetX, moveOffsetY, function() {
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
    if (typeof callback !== 'undefined') callback();
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

//-------------------------
// Map.updateActiveSceneNeuron
// -
// Updates co-ords, widths, etc of a neuron in active scene based on renderingScene
//-------------------------
Map.prototype.updateActiveSceneNeuronProperties = function(neuronId) {
  this.activeScene[neuronId].x = this.renderingScene[neuronId].x;
  this.activeScene[neuronId].y = this.renderingScene[neuronId].y;
  this.activeScene[neuronId].width = this.renderingScene[neuronId].width;
  this.activeScene[neuronId].height = this.renderingScene[neuronId].height;
  this.activeScene[neuronId].role = this.renderingScene[neuronId].role;
};