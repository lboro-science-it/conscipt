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
  this.viewMode = null;                                 // "portrait or landscape"
  this.fitXSF = 1, this.fitYSF = 1;                     // scaling factor when content needs to be scaled to fit screen

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
// Map.aH(neuron), Map.aW(neuron), Map.aX(neuron), Map.aY(neuron)
// -
// Get actual height, width,  x and y in pixels of neuron
//----------------------------
Map.prototype.aH = function(neuron) {
  return this.activeScene[neuron.id].rect.attrs.height;
};
Map.prototype.aW = function(neuron) {
  return this.activeScene[neuron.id].rect.attrs.width;
};
Map.prototype.aX = function(neuron) {
  return this.activeScene[neuron.id].rect.attrs.x;
};
Map.prototype.aY = function(neuron) {
  return this.activeScene[neuron.id].rect.attrs.y;
};
// get centre point in pixels of actual position in scene
Map.prototype.aXC = function(neuron) {
  return this.aX(neuron) + (this.aW(neuron) / 2);
};
Map.prototype.aYC = function(neuron) {
  return this.aY(neuron) + (this.aH(neuron) / 2);
};

//-----------------------------
// Map.rW, rH, rX, rY, rXC, rYC
// - 
// Calculate the co-ords based on %'s set in rendering scene'
//-----------------------------
Map.prototype.rW = function(neuron) {
  return this.scaleX(this.renderingScene[neuron.id].width);
};
Map.prototype.rH = function(neuron) {
  return this.scaleY(this.renderingScene[neuron.id].height);
};
Map.prototype.rX = function(neuron) {
  return this.scaleX(this.renderingScene[neuron.id].x) - (this.rW(neuron) / 2) + this.offsetX;
};
Map.prototype.rY = function(neuron) {
  return this.scaleY(this.renderingScene[neuron.id].y) - (this.rH(neuron) / 2) + this.offsetY;
};
Map.prototype.rXC = function(neuron) {
  return this.rX(neuron) + (this.rW(neuron) / 2);
};
Map.prototype.rYC = function(neuron) {
  return this.rY(neuron) + (this.rH(neuron) / 2);
};

//---------------------------
// Map.animateAdd(neurons, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateAdd = function(neurons, callback, iteration) {
  var self = this;
  if (!iteration) var iteration = 0;
  var neuron = self.getNeuron(neurons[iteration]);     // neuron object, use to check if it has a parent, so we know how to animate it in
  self.activeScene[neuron.id] = extend(true, {}, self.renderingScene[neuron.id]);  // clone the details from renderingScene (co-ords, etc)
  
  self.animateAddRect(neuron, function() {            // animate the rect in
    self.animateAddTitle(neuron);                     // once rect is in, animate the title in
    if (iteration + 1 == neurons.length && callback) callback();  // once final rect is added, callback
  });

  self.animateAddConnector(neuron);

  if (iteration + 1 < neurons.length) {               // still neurons to animate, move to the next iteration
    setTimeout(function() {
      self.animateAdd(neurons, callback, iteration + 1);
    }, self.parent.config.animations.add.interval);
  }
};

Map.prototype.animateAddConnector = function(neuron, callback) {
  if (n.hasParent(neuron)) {  // only add connector if neuron has a parent
    var self = this;
    var parent = neuron.parent;

    var border = this.parent.config.styles[neuron.style]["border-color"] || "#000";
    var borderWidth = this.parent.config.styles.default["border-width"] || 3;

    // connector from parent's centre to neuron's centre
    var fromX = this.rXC(parent);
    var fromY = this.rYC(parent);
    var toX = this.rXC(neuron);
    var toY = this.rYC(neuron);

    this.activeScene[neuron.id].connector = this.canvas.path("M" + fromX + " " + fromY)
    .attr({
      "stroke": border,
      "stroke-width": borderWidth,
      "pathlength": 0
    })
    .toBack();
    this.activeScene[neuron.id].connector.animate({
      path: "M" + fromX + ", " + fromY + "L" + toX + ", " + toY
    }, self.parent.config.animations.add.duration, function() {
      this[0].style["stroke-dasharray"] = this.getTotalLength() + "px";
      this[0].style["stroke-dashoffset"] = "0px";
    });
  }

  if (callback) callback();
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
    "x": self.rX(neuron),
    "y": self.rY(neuron),
    "width": self.rW(neuron),
    "height": self.rH(neuron)
  }, self.parent.config.animations.add.duration, "linear", function() {  // by here, rect is animated into place
    self.raphOnClickActivate(this, neuron);
    // todo: deal with tabindex stuff
    // self.activeScene[neuron.id].rect[0].tabIndex = 0;
    if (callback) callback();
  });
};

//--------------------
// Map.animateAddTitle(neuron)
// -
// iterate rows in a title of neuron object, animates to canvas, adds a reference to canvas object to activeScene
//--------------------
Map.prototype.animateAddTitle = function(neuron) {
  var self = this;
  var rectCentreX = this.rXC(neuron);    // x px centre of rendering neuron rect
  var rectTopY = this.rY(neuron);                                  // y px top of rendering neuron rect
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
Map.prototype.animateMove = function(animations, offsetX, offsetY, animConfig, callback, iteration) {
  var self = this;
  if (!iteration) var iteration = 0;

  var neuronAnimation = animations[iteration];                  // animation object, containing co-ords etc
  var neuron = this.activeScene[neuronAnimation.id];            // actual neuron object that is being dealt with
  this.activeScene[neuronAnimation.id].role = this.renderingScene[neuronAnimation.id].role;

  this.animateMoveTitle(neuronAnimation, offsetX, offsetY, animConfig);
  if (this.activeScene[neuron.parent]) { // if neuron parent is in scene we need to animate connector
    var parentAnimation = getAnimationByNeuronId(animations, neuron.parent);  // we need parent animation in order to do this.
    this.animateMoveConnector(neuronAnimation, parentAnimation, offsetX, offsetY, animConfig);
  }
  this.animateMoveRect(neuronAnimation, offsetX, offsetY, animConfig, function() {
    if (iteration + 1 == animations.length && callback) callback(); // callback only called after final rect is animated
  });

  if (iteration + 1 < animations.length) {                      // animate next if there are still iteratons to go
    this.animateMove(animations, offsetX, offsetY, animConfig, callback, iteration + 1);
  }
};

//-----------------------------
// Map.animateMoveConnector(neuronAnimation, offsetX, offsetY)
// -
// Animate the move of the connector. neuronAnimation contains the co-ords the connector's neuron will end up at. Also need to consider where the parent will end up.
//-----------------------------
Map.prototype.animateMoveConnector = function(neuronAnimation, parentAnimation, offsetX, offsetY, animConfig) {
  var self = this;
  var neuron = this.activeScene[neuronAnimation.id];
  var hasConnector = (neuron.connector);

  if (hasConnector) {   // only try and animate connector if it definitely exists
    var fromX = parentAnimation.x + parentAnimation.width / 2 + offsetX;
    var fromY = parentAnimation.y + parentAnimation.height / 2 + offsetY;
    var toX = neuronAnimation.x + neuronAnimation.width / 2 + offsetX;
    var toY = neuronAnimation.y + neuronAnimation.height / 2 + offsetY;

    var path = "M" + fromX + ", " + fromY + "L" + toX + ", " + toY;

    neuron.connector[0].style["stroke-dasharray"] = "9999px";       // ensures whole line is drawn when 'growing' lines

    neuron.connector.animate({
      path: path
    }, self.parent.config.animations[animConfig].duration, function() {        // once completed update this so can be animated out properly
      this[0].style["stroke-dasharray"] = this.getTotalLength() + "px";
    });
  }
};

Map.prototype.animateMoveRect = function(neuronAnimation, offsetX, offsetY, animConfig, callback) {
  var self = this;
  var neuron = this.activeScene[neuronAnimation.id];          // animation object contains destination co-ords etc
  neuron.rect.animate({
    "x": neuronAnimation.x + offsetX,
    "y": neuronAnimation.y + offsetY,
    "width": neuronAnimation.width, 
    "height": neuronAnimation.height
  }, self.parent.config.animations[animConfig].duration, "linear", function() {
    if (callback) callback();
  });
};

Map.prototype.animateMoveTitle = function(neuronAnimation, offsetX, offsetY, animConfig) {
  var self = this;
  var neuron = this.activeScene[neuronAnimation.id];              // object through which to access raphael text elems etc
  var x, y, fontSize, opacity;                                    // these are the only things we need to animate for titles
  
  x = neuronAnimation.x + offsetX + (neuronAnimation.width / 2);  // raphael x for text elem is always mid point of rect

  async.eachOf(neuron.title, function(row, index, nextRow) {      // iterate neuron.title[] - raphael text elem for each row of title
    var hasLatex = (typeof row.div !== 'undefined');    
    if (hasLatex) {                                               // latex = HTML elems which need to be animated in sync with dummy raphael elem
      eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
        row.div.style.fontSize = this.attrs["font-size"] + "px";
        row.div.style.opacity = this.attrs.opacity;
        row.div.style.left = (this.attrs.x - row.div.offsetWidth / 2) + "px";   // div positioning account for the fact the raphael elem is centre anchored
        row.div.style.top = (this.attrs.y - row.div.offsetHeight / 2) + "px";
      });
    }

    if (neuron.role == "zii") {                                   // neurons with role "zii" get hidden
      opacity = 0;
      fontSize = 0;
      y = neuronAnimation.y + offsetY + (neuronAnimation.height / 2);
      // todo: set up here so that on hover the title shows
    } else {                                                      // other neuron roles get title animated with rect
      var lineHeight = (neuronAnimation.height / neuron.title.length) - 1;                  // 1 = padding, as neuron height = its lineHeight * number of title rows + 1
      y = (neuronAnimation.y + (index * lineHeight) + 0.5 + (lineHeight / 2)) + offsetY;    // y = top of rect + multiple lineHeights + half of padding + middle of line point + offset
      fontSize = lineHeight / 2;
      opacity = 1;
    }

    row.text.animate({
      "x": x,
      "y": y,
      "font-size": fontSize,
      "opacity": opacity
    }, self.parent.config.animations[animConfig].duration, "linear", function() {
      if (row.div) eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
    });

    nextRow();
  });
};

//------------------------
// Map.animateRemove(neurons, callback, iteration)
// -
// Sequentially animate the removal of neurons, then call callback
//------------------------
Map.prototype.animateRemove = function(neurons, callback, iteration) {
  var self = this;
  var iteration = iteration || 0;
  var neuron = self.getNeuron(neurons[iteration]);     // neuron object of neuron to delete

  this.animateRemoveTitle(neuron, function() {
    self.animateRemoveConnector(neuron);
    self.animateRemoveRect(neuron, function() {         // only remove the rect once the title animation completes
      delete self.activeScene[neuron.id];
      if (iteration == neurons.length - 1 && callback) callback();  // callback once the last neuron rect remove has been animated
    });
  });

  if (iteration + 1 < neurons.length) {                 // call next animateRemove for next neuron that needs removing
    setTimeout(function() {
      self.animateRemove(neurons, callback, iteration + 1);
    }, self.parent.config.animations.remove.interval);
  }
};

Map.prototype.animateRemoveConnector = function(neuron, callback) {
  if (n.containsNeuron(this.activeScene, neuron) && this.activeScene[neuron.id].connector) {     // ensure neuron is present in scene, so a connection needs to be animated away

    var self = this;
    var connector = this.activeScene[neuron.id].connector;
    var pathLength = connector.getTotalLength();

    connector.attr({"width": 0});       // we will use the unused width attr to calculate the stroke-dasharray when we animate it

    eve.on('raphael.anim.frame.' + connector.id, onAnimate = function(i) {
      connector[0].style["stroke-dashoffset"] = connector.attrs.width * pathLength + "px";       // the raphael dummy elem will fade its opacity, div matches
    });

    this.activeScene[neuron.id].connector.animate({
      "width": 1           // not actually width, we are just making raphael animate this and using to calculate pathlength to 'animate out' the connector
    }, self.parent.config.animations.remove.duration, "linear", function() {
      eve.unbind('raphael.anim.frame.' + connector.id, onAnimate);
      this.remove();
    });

  }
  if (callback) callback();
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
    "height": 0
  }, self.parent.config.animations.remove.duration, "linear", function() {
    this.remove();
    if (callback) callback();
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
      if (index == neuronSceneObj.title.length - 1) nextRow();            // only move to callback once final animation is complete
    });
    if (index < neuronSceneObj.title.length - 1) nextRow();               // go directly to next row until final row
  }, function() {
    if (callback) callback();
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

// returns either the centre of the parent (if a neuron has a parent) or the centre of own final position
Map.prototype.getOriginX = function(neuron, scene) {
  var neuron = neuron.parent || neuron;
  var scene = scene || "rendering";
  if (scene == "rendering") return this.rXC(neuron);
  else return this.aXC(neuron);
};

// return either centre of parent, or centre of own position if no parent
Map.prototype.getOriginY = function(neuron, scene) {
  var neuron = neuron.parent || neuron;
  var scene = scene || "rendering";
  if (scene == "rendering") return this.rYC(neuron);
  else return this.aYC(neuron);
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

        self.animateMove(animations.anchor, offsetX, offsetY, "anchor", function() {
          next();
        });
      } else next();
    },
    function(next) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        var offsetX = 0, offsetY = 0;
        self.animateMove(animations.move, offsetX, offsetY, "move", function() {
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

// function that takes a percentage x (as defined in neuron scenes) and returns the position based on scaling factor
Map.prototype.scaleX = function(x) {
  return x * this.widthSF;
};

// return y co-ord based on scaling factor based on height of screen
Map.prototype.scaleY = function(y) {
  return y * this.heightSF;
};

// as implied, iterates through the array of animations looking for the one where id matches id
function getAnimationByNeuronId(animations, id) {
  var length = animations.length;
  for (var i = 0; i < length; i++) {
    if (animations[i].id == id) return animations[i];
  }
  return false;
};