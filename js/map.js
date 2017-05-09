// map.js - render scenes of neurons, maintain canvas, animations, etc

var dom = require('./dom');
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
  this.parent = parent;     // reference to Conscipt instance (so parent.neurons etc can be accessed)
  this.neurons = this.parent.neurons; 
  // scene state-related stuff
  this.activeScene = {};      // object that stores co-ords and Raphael objects of visible neurons
  this.activeNeuron = null;     // refers to the actual neuron object that is currently active
  this.renderingScene = {};   // refers to the actual scene object that is currently rendering
  this.renderingNeuron = {};  // refers to the actual neuron object that is currently rendering
  this.rendering = false;
  // map overall stuff
  this.width = 0, this.height = 0, this.widthSF = 0, this.heightSF = 0;
  this.lowestX = 0, this.greatestX = 0, this.greatestY = 0, this.lowestY = 0;       // todo: not sure if these are needed, consider removing if rendering to left is feasible
  this.connections = [];    // obj to store connections (paths) between neurons
  this.calculateSize(this.parent.div.id);
  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId});
  // re-render on resize
  window.addEventListener('resize', function() {
    clearTimeout(self.fireResize);  // only resize after 0.2 seconds
    self.fireResize = setTimeout(function() {self.resize();}, 200);
  }, true);
  // init the Raphael canvas
  this.canvas = Raphael(this.div, this.width, this.height);
};

//todo: neaten up below, create several helper functions, particularly around calculating co-ordinates etc, e.g. a 'getXfromPoint' type function

Map.prototype.getActiveX = function(neuron) {
  return this.scaleX(this.ax(neuron) - this.aw(neuron) / 2);
};

Map.prototype.getActiveY = function(neuron) {
  return this.scaleY(this.ay(neuron) - this.ah(neuron) / 2);
};

// convert a neuron's percentage co-ordinates in a rendering scene
Map.prototype.getRenderingX = function(neuron) {
  return this.scaleX(this.rx(neuron) - this.rw(neuron) / 2);
};

// convert a neuron's percentage y co-ord to its rendering position
Map.prototype.getRenderingY = function(neuron) {
  return this.scaleY(this.ry(neuron) - this.rh(neuron) / 2);
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

  //----------
  // STUFF RE: RECTANGLE
  //----------
  var fill = self.renderingScene[neuron.id].fill || "#fff";
  var border = self.renderingScene[neuron.id].border || "#000";
  if (hasParent(neuron)) {       // if neuron has a parent, create it at parent's co-ords before animating
    var x = self.getRenderingX(neuron.parent) + self.getRenderingWidth(neuron.parent) / 2;
    var y = self.getRenderingY(neuron.parent) + self.getRenderingHeight(neuron.parent) / 2;
  } else {                                          // otherwise create it in place at its own co-ords
    var x = self.getRenderingX(neuron) + self.getRenderingWidth(neuron) / 2;
    var y = self.getRenderingY(neuron) + self.getRenderingHeight(neuron) / 2;
  }
  // draw the rect
  self.activeScene[neuron.id].rect = self.canvas.rect(x, y, 0, 0)   // start with width/height of 0
    .attr({
      "fill": fill, 
      "stroke": border, 
      "stroke-width": 3,
      "opacity": 1})
    .data("neuronId", neuron.id)
    .click(function() {   
      self.parent.activate(self.parent.neurons[this.data("neuronId")]);
    })
    .hover(function() {
      this.attr({"cursor": "pointer"});
    }, function() {
      this.attr({"cursor": "normal"});
    })
    .toBack()
    .animate({                // animate into position
      "x": self.getRenderingX(neuron),
      "y": self.getRenderingY(neuron),
      "width": self.getRenderingWidth(neuron),
      "height": self.getRenderingHeight(neuron)
    }, 500, "linear", function() {      // rect is animated into place

      //----------
      // STUFF RE: TITLE
      //----------

      var x = self.scaleX(self.renderingScene[neuron.id].x);                                               // co-ords of middle of current rect
      var rectTopY = self.renderingScene[neuron.id].y - (self.renderingScene[neuron.id].height / 2);   // co-ords of top of current rect with 1
      var lineHeight = self.renderingScene[neuron.id].lineHeight;
      self.activeScene[neuron.id].title = [];                       // empty array for title elements to live in
      // add a text element for each part of title
      async.eachOf(neuron.title, function(row, index, nextRow) {
        // following is adding height of rows, 0.5 and half of the lineheight 

        var y = (rectTopY + (index * lineHeight) + 0.5 + (lineHeight / 2)) * self.heightSF;
        if (typeof row === "string") {  // just render text as usual
          var titleRow = self.canvas.text(x, y, row)
            .attr({
              "font-size": (lineHeight * self.heightSF) / 2,
              "opacity": 0
            })
            .data("neuronId", neuron.id)
            .click(function() {   
              self.parent.activate(self.parent.neurons[this.data("neuronId")]);
            })
            .hover(function() {
              this.attr({"cursor": "pointer"});
            }, function() {
              this.attr({"cursor": "normal"});
            })
            .animate({
              "opacity": 1
            }, 500, "linear");
          self.activeScene[neuron.id].title.push({
            "text": titleRow
          });
        } else if (typeof row === "object") {
          for (var key in row) {
            if (key == "latex") {
              var latexElem = document.createElement("DIV");      // element where latex is rendered
              var latexText = katex.renderToString(row[key]);     // text string
              latexElem.style.opacity = "0";
              latexElem.innerHTML = latexText;
              latexElem.style.cursor = "pointer";
              var latexRow = self.canvas.text(x, y, "").attr({
                "font-size": (lineHeight * self.heightSF) / 2,
                "opacity": 0
              });          // raphael element          
              self.activeScene[neuron.id].title.push({
                "text": latexRow,
                "div": latexElem
              });
              document.body.appendChild(latexElem);
              latexElem.addEventListener('click', function() {
                self.parent.activate(self.parent.neurons[neuron.id]);
              });

              latexElem.style.fontSize = (lineHeight * self.heightSF) / 2 + "px";
              latexElem.style.position = "absolute";

              setTimeout(function() { // create a dummy raphael element and use it to animate this one in
                latexElem.style.top = y - latexElem.offsetHeight / 2 + "px";
                latexElem.style.left = x - latexElem.offsetWidth / 2 + "px";
              }, 100);

              eve.on('raphael.anim.frame.' + latexRow.id, onAnimate = function(index) {
                latexElem.style.opacity = this.attrs.opacity;
              });

              latexRow.animate({
                "opacity": 1
              }, 500, "linear", function() {
                eve.unbind('raphael.anim.frame.' + latexRow.id, onAnimate);
              });
            } // end if key === latex
          } 
        } // end if row === object
      });      
      if (iteration + 1 == neurons.length) callback();  // rect is added, so call callback
    });

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

  if (iteration + 1 < neurons.length) {     // add the next one after 100 ms
    setTimeout(function() {
      self.animateAdd(neurons, callback, iteration + 1);
    }, 100);
  }

};

//---------------------------
// Map.animateMove(animations, callback, iteration)
// -
// Works through neurons, an object of animation attributes, and after the last one, calls callback
//---------------------------
Map.prototype.animateMove = function(animations, offsetX, offsetY, callback, iteration) {
  var self = this;
  if (typeof iteration === 'undefined') var iteration = 0;

  var animation = animations[iteration];
  var neuronToAnimate = this.activeScene[animation.id];

  // keep neurons in activeScene up to date
  this.activeScene[animation.id].x = this.renderingScene[animation.id].x;
  this.activeScene[animation.id].y = this.renderingScene[animation.id].y;
  this.activeScene[animation.id].width = this.renderingScene[animation.id].width;
  this.activeScene[animation.id].height = this.renderingScene[animation.id].height;
  this.activeScene[animation.id].role = this.renderingScene[animation.id].role;

  if (containsNeuron(this.connections, neuronToAnimate)) {
    // animate moving the connections here
  }

  // todo: KATEX elements aren't moving when it's a Zii, fix it

  //----------
  // TITLES
  //----------
  async.eachOf(neuronToAnimate.title, function(row, index, nextRow) {
    var fontSize = row.text.attrs["font-size"]
    if (neuronToAnimate.role == "zii") {      // hide ZII neurons
      if (typeof row.div !== 'undefined') {
        eve.on('raphael.anim.frame.' + row.text.id, onAnimate = function(i) {
          row.div.style.opacity = this.attrs.opacity;
          row.div.style.left = (this.attrs.x - row.div.offsetWidth / 2) + "px";
          row.div.style.top = (this.attrs.y - row.div.offsetHeight / 2) + "px";
        });
      }
      row.text.animate({
        "opacity": 0,
        "x": animation.x + offsetX + (animation.width / 2),
        "y": animation.y + offsetY + (animation.height / 2)
      }, 500, "linear", function() {
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
      var x = animation.x + (animation.width / 2);
      var rectTopY = animation.y;
      var lineHeight = (animation.height / neuronToAnimate.title.length) - 1;
      var y = (rectTopY + (index * lineHeight) + 0.5 + (lineHeight / 2));

      row.text.animate({    // todo, here animate to new position as per setting when adding.
        "x": x + offsetX,
        "y": y + offsetY,
        "font-size": lineHeight / 2,
        "opacity": 1
      }, 500, "linear", function() {
        if (typeof row.div !== 'undefined') eve.unbind('raphael.anim.frame.' + row.text.id, onAnimate);
      })
    }

    nextRow();
  });

  //----------
  // MOVE TITLES THAT WILL BE VISIBLE
  //----------

  neuronToAnimate.rect.animate({
    "x": animation.x + offsetX,
    "y": animation.y + offsetY,
    "width": animation.width, // todo: function to calculate width w/ SF
    "height": animation.height // todo: put height in here!
    // todo: insert code to move the neuron to its new position and size
  }, 500, "linear", function() {
  //  if (iteration == 0) eve.unbind('raphael.anim.frame.' + neuronToAnimate.rect.id, onAnimate);
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
    }, 500, "linear", function() {
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
    if (hasParent(neuron)) {  // if neuron has a parent, get the parent's co-ords to animate to there
      x = self.activeScene[neuron.parent.id].rect.attrs.x + self.activeScene[neuron.parent.id].rect.attrs.width / 2;
      y = self.activeScene[neuron.parent.id].rect.attrs.y + self.activeScene[neuron.parent.id].rect.attrs.height / 2;
    } else {                                          // simply animate the neuron to its own centre
      x = self.activeScene[neuron.id].rect.attrs.x;
      y = self.activeScene[neuron.id].rect.attrs.y;
    }
    // remove connecting lines
    // todo: animate these out
    if (containsNeuron(self.connections, neuron)) {
      self.connections[neuron.id].remove();
      delete self.connections[neuron.id];
    }
    neuronToDelete.rect.animate({
      "x": x,
      "y": y,
      "width": 0,
      "height": 0,
      "opacity": 0
    }, 500, "linear", function() {
      this.remove();                                      // removes the rect instance
      delete self.activeScene[neuron.id];
      if (iteration == neurons.length - 1) callback();    // all animations are complete
    });
  });

  // if there is another neuron to animateRemove
  if (iteration + 1 < neurons.length) {
    setTimeout(function() {
      self.animateRemove(neurons, callback, iteration + 1);
    }, 100);
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

  if (((containerDiv.offsetWidth / 16) * 9) > containerDiv.offsetHeight) {  // if wider than 16:9 ratio, calculate width based on height
    this.height = containerDiv.offsetHeight;
    this.width = (this.height / 9) * 16;
  } else {                            // if taller than 16:9 ratio, calculate height based on width
    this.width = containerDiv.offsetWidth;
    this.height = (this.width / 16) * 9;
  }
  this.widthSF = this.width / 100;      // width scaling factor for percentage co-ords
  this.heightSF = this.height / 100;    // height scaling factor for percentage co-ords

  // todo: vertical positioning (center)
  // todo: incorporate view mode (i.e. if we are viewing a resource)
  // todo: incorporate view mode (i.e. portrait vs landscape, small screen)
};

// function to iterate ancestor neurons (and their children) determining whether they need to be removed when rendering newscene, callback if so
Map.prototype.findAncestorsToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (containsNeuron(this.activeScene, neuron)) {   // only bother if the neuron exists in the current scene
    var neuron = this.neurons[neuron.id];
    if (hasParent(neuron)) {   // if neuron has an ancestor, check if it's in the scene and so may need removing
      var ancestor = neuron.parent;
      self.findChildrenToRemove(ancestor, activeNeuron, newScene, true, callback);    // todo: need to have a way to ignore neuron here
      self.findAncestorsToRemove(ancestor, ancestor, newScene, true, callback);   
    } else {  // neuron doesn't have an ancestor, if we are recursing then check if it needs animating out of scene
      if (!recursing && !containsNeuron(newScene, neuron)) callback(neuron);
    }
  }
};

// iterate child neurons until childless, identifiying those which need removal (deal with in callback)
Map.prototype.findChildrenToRemove = function(neuron, activeNeuron, newScene, recursing, callback) {
  var self = this;
  if (containsNeuron(this.activeScene, neuron)) { // only check when the neuron is in the active scene
    var neuron = this.neurons[neuron.id];  // get the neuron object of the neuron who's children we are looking for
    if (hasChildren(neuron)) {   // if neuron has children, first check if they are in the scene and need removing
      async.each(neuron.children, function(child, nextChild) {
        // checking child.id != activeNeuron.id allows ancestorsToRemove to use this function without searching itself
        if (child.id != activeNeuron.id) self.findChildrenToRemove(child, activeNeuron, newScene, true, callback);
        nextChild();
      },
      function() {  // by this time, all children have been checked, so check if this neuron needs animating out of the scene
        if (!containsNeuron(newScene, neuron)) callback(neuron);
      });
    } else {  // if neuron doesn't have children, check if it itself needs animating out of the scene - only applies when recursing (i.e. not to the original neuron)
      if (!recursing &&  !containsNeuron(newScene, neuron)) callback(neuron); 
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

  this.greatestX = 0, this.lowestX = 100, this.greatestY = 0, this.lowestY = 100;
  var animations = { remove: [], anchor: [], move: [], add: [] };
  var anchorGreatestX = 0, anchorLowestX = this.width, anchorGreatestY = 0, anchorLowestY = this.height;

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
        var offsetX = self.scaleX(self.ax(self.renderingNeuron) - self.rx(self.renderingNeuron));
        var offsetY = self.scaleY(self.ay(self.renderingNeuron) - self.ry(self.renderingNeuron));

        async.each(self.activeScene, function(neuron, nextNeuron) {
          if (containsNeuron(self.renderingScene, neuron)) {   // if neuron exists in activeScene and renderingScene, it needs to be moved
           
            animations.anchor.push({
              id: neuron.id,
              x: self.getRenderingX(neuron) + offsetX,     // todo: have to do something here to check none of the offsets take us off the screen
              y: self.getRenderingY(neuron) + offsetY,     // todo: and here
              width: self.getRenderingWidth(neuron),
              height: self.getRenderingHeight(neuron)
            });

            // track any of the neurons which have gone beyond the edge of the canvas, which will be used to offset when animating moves
            if (self.getRenderingX(neuron) + offsetX < anchorLowestX) anchorLowestX = self.getRenderingX(neuron) + offsetX;
            if (self.getRenderingX(neuron) + offsetY > anchorGreatestX) anchorGreatestX = self.getRenderingX(neuron) + offsetX;
            if (self.getRenderingY(neuron) + offsetY < anchorLowestY) anchorLowestY = self.getRenderingY(neuron) + offsetY;
            if (self.getRenderingY(neuron) + offsetY > anchorGreatestY) anchorGreatestY = self.getRenderingY(neuron) + offsetY;

            console.log(self.getRenderingX(neuron) + offsetX);

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
        var offsetX = 0;
        var offsetY = 0;
        self.animateMove(animations.anchor, offsetX, offsetY, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        var offsetX = 0;
        var offsetY = 0;
        self.animateMove(animations.move, offsetX, offsetY, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // determine which neurons need to be added to scene
      async.each(self.renderingScene, function(neuron, next) {
        self.updateBoundingPoints(neuron);
        if (!containsNeuron(self.activeScene, neuron)) animations.add.push(neuron.id);
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
  this.canvas.setSize(this.width, this.height);
  this.render(this.activeNeuron);
};

//-------------------------
// Map.updateBoundingPoints(neuron)
// -
// maintains map.greatestX, lowestX, greatestY, lowestY, by seeing if neuron is greater or lower than them etc.
//-------------------------
Map.prototype.updateBoundingPoints = function(neuron) {
  var x = this.rx(neuron);
  var y = this.ry(neuron);
  var width = this.rw(neuron);
  var height = this.rh(neuron);
  if (this.greatestX < x + width / 2) this.greatestX = x + width / 2;
  if (this.lowestX > x - width / 2) this.lowestX = x - width / 2;
  if (this.greatestY < y + height / 2) this.greatestY = y + height / 2;
  if (this.lowestY > y - height / 2) this.lowestY = y - height / 2;
}

var hasChildren = function(neuron) {
  return typeof neuron.children !== 'undefined';
}

var hasParent = function(neuron) {
  return typeof neuron.parent !== 'undefined';
};

var containsNeuron = function(collection, neuron) {
  return typeof collection[neuron.id] !== 'undefined';
};