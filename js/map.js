// map.js - render scenes of neurons, maintain canvas, animations, etc

var dom = require('./dom');
var n = require('./neuron');

var async = require('async');
var extend = require('extend');
var Raphael = require('raphael');   // Raphael = graphic library
var katex = require('katex');

module.exports = Map;

//----------------------
// Map(parent, mapDivId, containerDivId)
// - 
// constructor
//----------------------
function Map(parent, mapDivId, containerDivId) {
  var self = this;
  this.parent = parent;     // reference to Conscipt instance (so parent.neurons etc can be accessed
  this.neurons = this.parent.neurons; 
  this.config = this.parent.config;
  
  // scene state-related stuff
  this.activeScene = {}, this.activeNeuron = null;      // contains % co-ords etc for currently visible scene
  this.renderingScene = {}, this.renderingNeuron = {};  // contains % co-ords etc for currently rendering neuron / scene
  this.rendering = false;
  
  // map overall stuff
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

Map.prototype.getActiveX = function(neuron) {
  return this.scaleX(this.ax(neuron) - this.aw(neuron) / 2);
};

Map.prototype.getActiveY = function(neuron) {
  return this.scaleY(this.ay(neuron) - this.ah(neuron) / 2);
};

// convert a neuron's percentage co-ordinates in a rendering scene
Map.prototype.getRenderingX = function(neuron) {
  return this.scaleX(this.rx(neuron) - this.rw(neuron) / 2) + this.offsetX;
};

// convert a neuron's percentage y co-ord to its rendering position
Map.prototype.getRenderingY = function(neuron) {
  return this.scaleY(this.ry(neuron) - this.rh(neuron) / 2) + this.offsetY;
};

// convert a neuron's 
Map.prototype.getRenderingWidth = function(neuron) {
  return this.scaleX(this.rw(neuron));
};

Map.prototype.getRenderingHeight = function(neuron) {
  return this.scaleY(this.rh(neuron));
};

Map.prototype.ax = function(neuron) {
  return this.activeScene[neuron.id].x;
};

Map.prototype.ay = function(neuron) {
  return this.activeScene[neuron.id].y;
};

Map.prototype.aw = function(neuron) {
  return this.activeScene[neuron.id].width;
};

Map.prototype.ah = function(neuron) {
  return this.activeScene[neuron.id].height;
};

// x of neuron in rendering scene in percentage
Map.prototype.rx = function(neuron) {
  return this.renderingScene[neuron.id].x;
};

// y of neuron in rendering scene in percentage
Map.prototype.ry = function(neuron) {
  return this.renderingScene[neuron.id].y;
};

// width of neuron in rendering scene in percentage
Map.prototype.rw = function(neuron) {
  return this.renderingScene[neuron.id].width;
};

// height of neuron in rendering scene in percentage
Map.prototype.rh = function(neuron) {
  return this.renderingScene[neuron.id].height;
};

// function that takes a percentage x (as defined in neuron scenes) and returns the position based on scaling factor
Map.prototype.scaleX = function(x) {
  return x * this.widthSF;
};

// return y co-ord based on scaling factor based on height of screen
Map.prototype.scaleY = function(y) {
  return y * this.heightSF;
};

// returns either the centre of the parent (if a neuron has a parent) or the centre of own final position
Map.prototype.getStartingX = function(neuron) {
  var neuron = neuron.parent || neuron;
  return this.getRenderingX(neuron) + this.getRenderingWidth(neuron) / 2;
};

// return either centre of parent, or centre of own position if no parent
Map.prototype.getStartingY = function(neuron) {
  var neuron = neuron.parent || neuron;
  return this.getRenderingY(neuron) + this.getRenderingHeight(neuron) / 2;
};

// register click handler for a raphael object to activate a neuron + set cursor
Map.prototype.raphOnClickActivate = function(raphaelObj, neuron) {
  var self = this;
  raphaelObj.data("neuronId", neuron.id)
  .click(function() {
    self.parent.activate(self.parent.neurons[this.data("neuronId")]);
  })
  .hover(function() {
    this.attr({"cursor": "pointer"});
  }, function() {
    this.attr({"cursor": "normal"});
  });
};

Map.prototype.animateAddRect = function(neuron, callback) {
  var self = this;
  var startingX = this.getStartingX(neuron);
  var startingY = this.getStartingY(neuron);

  this.activeScene[neuron.id].rect = this.canvas.rect(startingX, startingY, 0, 0)
  .attr({
    "fill": self.renderingScene[neuron.id].fill,
    "stroke": self.renderingScene[neuron.id].border,
    "stroke-width": 3,
    "opacity": 1
  })
  .toBack()
  .animate({
    "x": self.getRenderingX(neuron),
    "y": self.getRenderingY(neuron),
    "width": self.getRenderingWidth(neuron),
    "height": self.getRenderingHeight(neuron)
  }, self.config.animations.add.duration, "linear", function() {  // by here, rect is animated into place
    self.raphOnClickActivate(this, neuron);
    // todo: deal with tabindex stuff
    // self.activeScene[neuron.id].rect[0].tabIndex = 0;
    callback();
  });
}

Map.prototype.animateAddTitle = function(neuron) {
  var self = this;
  var rectCentreX = this.getRenderingX(neuron) + this.getRenderingWidth(neuron) / 2;    // x px centre of rendering neuron rect
  var rectTopY = this.getRenderingY(neuron);                                  // y px top of rendering neuron rect
  var lineHeight = this.renderingScene[neuron.id].lineHeight;                 // height (percent) of each text line for current neuron
  this.activeScene[neuron.id].title = [];

  async.eachOf(neuron.title, function(row, index, nextRow) {        // iterate parts of title
    var y = rectTopY + self.scaleY(index * lineHeight + 0.5 + lineHeight / 2);    // calc position for current row based on lineHeight and a 0.5 padding
    var fontSize = self.scaleY(lineHeight) / 2;

    if (typeof row === "string") {            // create svg text element for strings in array
      var type = "string";
      var textContent = row;                      // svg text element will contain the content
    } else if (typeof row === "object") {     // process object enabling custom title types
      var type = Object.keys(row)[0];
      var textContent = "";                       // svg text element will be empty but used for animations etc
      var customContent = row[type];              // custom content will be overlaid onto svg element
    }

    var titleObj = {                          // object to keep track of raphael objects / divs for a given neuron
      "text": self.canvas.text(rectCentreX, y, textContent)
      .attr({
        "font-size": fontSize,
        "opacity": 0
      })
    };

    if (type == "latex") {
      var latexElem = dom.addChildDiv({
        "id": neuron.id + "-title-" + index,
        "style": {
          "cursor": "pointer",
          "fontSize": fontSize + "px",
          "opacity": "0",
          "position": "absolute"
        }
      });

      latexElem.innerHTML = katex.renderToString(customContent);

      latexElem.addEventListener('click', function() {
        self.parent.activate(self.parent.neurons[neuron.id]);
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
    }, self.config.animations.add.duration, "linear", function() {
      if (type == "string") self.raphOnClickActivate(this, neuron);
      if (type == "latex") eve.unbind('raphael.anim.frame.' + titleObj.text.id, onAnimate);
    });
  });
};

//---------------------------
// Map.animateAdd(neurons, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateAdd = function(neurons, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;
  var neuron = self.neurons[neurons[iteration]];     // neuron object, use to check if it has a parent, so we know how to animate it in
  self.activeScene[neuron.id] = extend(true, {}, self.renderingScene[neuron.id]);  // clone the details from renderingScene (co-ords, etc)
  
  self.animateAddRect(neuron, function() {            // animate the rect in
    self.animateAddTitle(neuron);                     // once rect is in, animate the title in
    // todo: add connections
    if (iteration + 1 == neurons.length) callback();  // once final rect is added, callback
  });

  if (iteration + 1 < neurons.length) {               // still neurons to animate, move to the next iteration
    setTimeout(function() {
      self.animateAdd(neurons, callback, iteration + 1);
    }, self.config.animations.add.interval);
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

//---------------------------
// Map.animateMove(animations, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateMove = function(animations, offsetX, offsetY, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;

  var neuronAnimation = animations[iteration];              // animation object, containing co-ords etc
  var neuron = this.activeScene[neuronAnimation.id];        // actual neuron object that is being dealt with

  this.updateActiveSceneNeuronProperties(neuronAnimation.id);         // update co-ords of neuron in activeScene to match those in renderingScene

  if (n.containsNeuron(this.connections, neuron)) {
    // animate moving the connections here
  }

  //----------
  // TITLES
  //----------
  async.eachOf(neuron.title, function(row, index, nextRow) {
    var fontSize = row.text.attrs["font-size"]
    if (neuron.role == "zii") {      // hide ZII neurons
      if (typeof row.div !== 'undefined') {
        eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
          row.div.style.opacity = this.attrs.opacity;
          row.div.style.left = (this.attrs.x - row.div.offsetWidth / 2) + "px";
          row.div.style.top = (this.attrs.y - row.div.offsetHeight / 2) + "px";
        });
      }
      row.text.animate({
        "opacity": 0,
        "x": neuronAnimation.x + offsetX + (neuronAnimation.width / 2),
        "y": neuronAnimation.y + offsetY + (neuronAnimation.height / 2)
      }, self.config.animations.move.duration, "linear", function() {
        if (typeof row.div !== 'undefined') eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
      });
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
      }, self.config.animations.move.duration, "linear", function() {
        if (typeof row.div !== 'undefined') eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
      })
    }

    nextRow();
  });

  //----------
  // MOVE TITLES THAT WILL BE VISIBLE
  //----------

  neuron.rect.animate({
    "x": neuronAnimation.x + offsetX,
    "y": neuronAnimation.y + offsetY,
    "width": neuronAnimation.width, 
    "height": neuronAnimation.height
  }, self.config.animations.move.duration, "linear", function() {
    if (iteration + 1 == animations.length) callback();  // callback only gets called when the last one is done
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
  var neuron = self.neurons[neurons[iteration]];     // neuron object of neuron to delete
  var neuronToDelete = self.activeScene[neuron.id]; // neuron object in scene

  //----------
  // STUFF RE: TITLE
  //----------
  async.eachOf(neuronToDelete.title, function(row, index, nextRow) {
    if (typeof row.div !== 'undefined') {   // if there is a div we need to link its animation to the raphael element
      eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
        row.div.opacity = this.attrs.opacity;
      });
    }
    row.text.animate({
      "opacity": 0
    }, self.config.animations.remove.duration, "linear", function() {
      if (typeof row.div !== 'undefined') {
        eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
        row.div.parentNode.removeChild(row.div);
      }
      this.remove();
      delete neuronToDelete.title[index];
      if (index == neuronToDelete.title.length - 1) nextRow();    // wait until the last elem finishes animating before calling callback
    });
    if (index < neuronToDelete.title.length - 1) nextRow();   // only iterate async until the last elem
  },
  function() {  // all title rows (text) have been removed
    //----------
    // STUFF RE: RECT
    //----------
    var x;
    var y;
    if (n.hasParent(neuron)) {  // if neuron has a parent, get the parent's co-ords to animate to there
      x = self.activeScene[neuron.parent.id].rect.attrs.x + self.activeScene[neuron.parent.id].rect.attrs.width / 2;
      y = self.activeScene[neuron.parent.id].rect.attrs.y + self.activeScene[neuron.parent.id].rect.attrs.height / 2;
    } else {                                          // simply animate the neuron to its own centre
      x = self.activeScene[neuron.id].rect.attrs.x + self.activeScene[neuron.id].rect.attrs.width / 2;
      y = self.activeScene[neuron.id].rect.attrs.y + self.activeScene[neuron.id].rect.attrs.height / 2;
    }
    // remove connecting lines
    // todo: animate these out
    if (n.containsNeuron(self.connections, neuron)) {
      self.connections[neuron.id].remove();
      delete self.connections[neuron.id];
    }
    neuronToDelete.rect.animate({
      "x": x,
      "y": y,
      "width": 0,
      "height": 0,
      "opacity": 0
    }, self.config.animations.remove.duration, "linear", function() {
      this.remove();                                      // removes the rect instance
      delete self.activeScene[neuron.id];
      if (iteration == neurons.length - 1) callback();    // all animations are complete
    });
  });

  // if there is another neuron to animateRemove
  if (iteration + 1 < neurons.length) {
    setTimeout(function() {
      self.animateRemove(neurons, callback, iteration + 1);
    }, self.config.animations.remove.interval);
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

  // todo: incorporate view mode (i.e. if we are viewing a resource)
  // todo: incorporate view mode (i.e. portrait vs landscape, small screen)
};

// function to iterate ancestor neurons (and their children) determining whether they need to be removed when rendering newscene, callback if so
Map.prototype.findAncestorsToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (n.containsNeuron(this.activeScene, neuron)) {   // only bother if the neuron exists in the current scene
    var neuron = this.neurons[neuron.id];
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
    var neuron = this.neurons[neuron.id];  // get the neuron object of the neuron who's children we are looking for
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
    function(callback) {  // check what neurons need to be removed from scene, in order starting from activeNeuron
      if (self.activeNeuron !== null) {
        self.findChildrenToRemove(self.activeNeuron, self.activeNeuron, self.renderingScene, false, function(child) {
          animations.remove.push(child.id);
        });
      }
      callback();
    },
    function(callback) {  // check what ancestors need to be removed from the scene in order starting from activeNeuron
      if (self.activeNeuron !== null) {
        self.findAncestorsToRemove(self.activeNeuron, self.activeNeuron, self.renderingScene, false, function(ancestor) {
          animations.remove.push(ancestor.id);
        });
      }
      callback();
    },
    function(callback) {  // animate the removals
      if (animations.remove.length > 0) {
        self.animateRemove(animations.remove, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // check what neurons need to be moved
      if (self.activeNeuron !== null) {
        // calculate difference between new active neuron's position in new scene and current scene
        var sceneOffsetX = self.scaleX(self.ax(self.renderingNeuron) - self.rx(self.renderingNeuron));
        var sceneOffsetY = self.scaleY(self.ay(self.renderingNeuron) - self.ry(self.renderingNeuron));

        // anchor part is broken
        // offset = difference between new active node's position in the current scene and its position in the new scene (centre co-ordinates)

        async.each(self.activeScene, function(neuron, nextNeuron) {
          if (n.containsNeuron(self.renderingScene, neuron)) {   // if neuron exists in activeScene and renderingScene, it needs to be moved
            animations.anchor.push({
              id: neuron.id,
              x: self.getRenderingX(neuron) + sceneOffsetX,
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
          callback();
        });
      } else callback();
    },
    function(callback) {  // move ancestors to new sizes and positions relative to new active neuron
      if (animations.anchor.length > 0) {

        var anchorOffsetX = 0, anchorOffsetY = 0;
        // apply anchor offsets to prevent rects going off screen
        if (anchorLowestX < 0) anchorOffsetX = -anchorLowestX + self.scaleX(4);
        if (anchorGreatestX > self.viewportWidth) anchorOffsetX = (self.viewportWidth - anchorGreatestX) - self.scaleX(4);
        if (anchorLowestY < 0) anchorOffsetY = -anchorLowestY + self.scaleY(4);
        if (anchorGreatestY > self.viewportHeight) anchorOffsetY = (self.viewportHeight - anchorGreatestY) - self.scaleY(4);

        self.animateMove(animations.anchor, anchorOffsetX, anchorOffsetY, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        var moveOffsetX = 0;
        var moveOffsetY = 0;
        self.animateMove(animations.move, moveOffsetX, moveOffsetY, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // determine which neurons need to be added to scene
      async.each(self.renderingScene, function(neuron, next) {
        if (!n.containsNeuron(self.activeScene, neuron)) animations.add.push(neuron.id);
        next();
      },
      function() {
        callback();
      });
    },
    function(callback) {    // animate adding the above neurons
      if (animations.add.length > 0) {
        self.animateAdd(animations.add, function() {
          callback();
        });
      } else callback();
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