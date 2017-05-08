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
  // map overall stuff
  this.width = 0, this.height = 0, this.widthSF = 0, this.heightSF = 0;
  this.lowestX = 0, this.greatestX = 0, this.greatestY = 0, this.lowestY = 0;
  this.connections = [];    // obj to store connections (paths) between neurons
  this.calculateSize(this.parent.div.id);
  this.div = dom.addChildDiv({"id": mapDivId,"parent":containerDivId,"style":{"border":"solid 1px #d4d4d4"}});
  // re-render on resize
  window.addEventListener('resize', function() {
    clearTimeout(self.fireResize);  // only resize after 0.2 seconds
    self.fireResize = setTimeout(function() {self.resize();}, 200);
  }, true);
  // init the Raphael canvas
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

  var neuron = self.neurons[neurons[iteration]];     // neuron object, use to check if it has a parent, so we know how to animate it in

  // todo: think of how we will account for hiding text when not child
  // probably a 'type' property in each scene, indicating whether the neuron is active, child, ancestor, etc in the scene, and therefore whether to display full title, etc

  self.activeScene[neuron.id] = extend(true, {}, self.renderingScene[neuron.id]);  // clone the details from renderingScene (co-ords, etc)





  // stuff pertaining to RECTANGLE BOX
  var fill = self.renderingScene[neuron.id].fill || "#fff";
  var border = self.renderingScene[neuron.id].border || "#000";
  if (typeof neuron.parent !== 'undefined') {       // if neuron has a parent, create it at parent's co-ords before animating
    var x = (self.renderingScene[neuron.parent.id].x + self.renderingScene[neuron.parent.id].width / 2) * self.widthSF;
    var y = (self.renderingScene[neuron.parent.id].y + self.renderingScene[neuron.parent.id].height / 2) * self.heightSF;
  } else {                                          // otherwise create it in place at its own co-ords
    var x = (self.renderingScene[neuron.id].x + self.renderingScene[neuron.id].width / 2) * self.widthSF;
    var y = (self.renderingScene[neuron.id].y + self.renderingScene[neuron.id].height / 2) * self.heightSF;
  }


  self.activeScene[neuron.id].rect = self.canvas.rect(x, y, 0, 0)
    .attr({
      "fill": fill, 
      "stroke": border, 
      "stroke-width": 3,
      "opacity": 1})
    .data("neuronId", neuron.id)
    .click(function() {
      self.parent.activate(self.parent.neurons[this.data("neuronId")]);
    })
    .toBack()
    .animate({
      "x": (self.renderingScene[neuron.id].x - self.renderingScene[neuron.id].width / 2) * self.widthSF,
      "y": (self.renderingScene[neuron.id].y - self.renderingScene[neuron.id].height / 2) * self.heightSF,
      "width": self.renderingScene[neuron.id].width * self.widthSF,
      "height": self.renderingScene[neuron.id].height * self.heightSF
    }, 500, "linear", function() {      // rect is animated into place


      // stuff pertaining to TITLE

      var x = self.renderingScene[neuron.id].x * self.widthSF;                                               // co-ords of middle of current rect
      var rectTopY = self.renderingScene[neuron.id].y - (self.renderingScene[neuron.id].height / 2);   // co-ords of top of current rect with 1
      var lineHeight = self.renderingScene[neuron.id].lineHeight;
      self.activeScene[neuron.id].title = [];                       // empty array for title elements to live in
      self.activeScene[neuron.id].titleElems = [];                  // array for html elements of latex stuff
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
            .animate({
              "opacity": 1
            }, 500, "linear");
          self.activeScene[neuron.id].title.push(titleRow);
        } else if (typeof row === "object") {
          for (var key in row) {
            if (key == "latex") {
              var latexElem = document.createElement("DIV");      // element where latex is rendered
              var latexText = katex.renderToString(row[key]);     // text string
              latexElem.style.opacity = "0";
              latexElem.innerHTML = latexText;            
              var latexRow = self.canvas.text(x, y, "").attr({
                "opacity": 0
              });          // raphael element          
              self.activeScene[neuron.id].titleElems.push({
                "text": latexRow,
                "div": latexElem
              });
              document.body.appendChild(latexElem);

              latexElem.style.fontSize = (lineHeight * self.heightSF) / 2;
              latexElem.style.position = "absolute";
              latexElem.style.top = (y - ((lineHeight * self.heightSF) / 2)) + "px";

              setTimeout(function() { // create a dummy raphael element and use it to animate this one in
                latexElem.style.left = x - latexElem.offsetWidth / 2 + "px";
              }, 100);

              var index = self.activeScene[neuron.id].titleElems.length;

              eve.on('raphael.anim.frame.' + latexRow.id, onAnimate = function(index) {
                latexElem.style.opacity = this.attrs.opacity;
                console.log(latexElem);
              });

              latexRow.animate({
                "opacity": 1
              }, 500, "linear", function() {
                eve.unbind('raphael.anim.frame.' + latexRow.id, onAnimate);
              });



/*
    eve.on('raphael.anim.frame.' + neuronToAnimate.rect.id, onAnimate = function(animationObject) {
      elem.style.left = (this.attrs.x + this.attrs.width / 4) + 'px';
      elem.style.top = (this.attrs.y + this.attrs.height / 2) + 'px';
      elem.style.fontSize = (this.attrs.x / 100) + 'em';
    });
  }

  neuronToAnimate.rect.animate({
    "x": animation.x,
    "y": animation.y,
    "width": animation.width, // todo: function to calculate width w/ SF
    "height": animation.height // todo: put height in here!
    // todo: insert code to move the neuron to its new position and size
  }, 500, "linear", function() {
  //  if (iteration == 0) eve.unbind('raphael.anim.frame.' + neuronToAnimate.rect.id, onAnimate);

*/
            } // end if key === latex
          } 
        } // end if row === object

      });      

      if (iteration + 1 == neurons.length) callback();  // rect is added, so call callback
    });

  if (iteration + 1 < neurons.length) {
    setTimeout(function() {
      self.animateAdd(neurons, callback, iteration + 1);
    }, 100);
  }

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
Map.prototype.animateMove = function(animations, callback, iteration) {
  if (typeof iteration === 'undefined') var iteration = 0;

  var animation = animations[iteration];
  var neuronToAnimate = this.activeScene[animation.id];

  // todo: update this.activeScene
  this.activeScene[animation.id].x = this.renderingScene[animation.id].x;
  this.activeScene[animation.id].y = this.renderingScene[animation.id].y;
  this.activeScene[animation.id].width = this.renderingScene[animation.id].width;
  this.activeScene[animation.id].height = this.renderingScene[animation.id].height;
  this.activeScene[animation.id].role = this.renderingScene[animation.id].role;

  if (typeof this.connections[animation.id] !== 'undefined') {
    // animate moving the connections here
  }

/*
  if (iteration == 0) {
    var elem = document.getElementById("testElem");

    eve.on('raphael.anim.frame.' + neuronToAnimate.rect.id, onAnimate = function(animationObject) {
      elem.style.left = (this.attrs.x + this.attrs.width / 4) + 'px';
      elem.style.top = (this.attrs.y + this.attrs.height / 2) + 'px';
      elem.style.fontSize = (this.attrs.x / 100) + 'em';
    });
  }
*/
  neuronToAnimate.rect.animate({
    "x": animation.x,
    "y": animation.y,
    "width": animation.width, // todo: function to calculate width w/ SF
    "height": animation.height // todo: put height in here!
    // todo: insert code to move the neuron to its new position and size
  }, 500, "linear", function() {
  //  if (iteration == 0) eve.unbind('raphael.anim.frame.' + neuronToAnimate.rect.id, onAnimate);
    if (iteration + 1 == animations.length) callback();  // callback only gets called when the last one is done
  });
  if (iteration + 1 < animations.length) {
    this.animateMove(animations, callback, iteration + 1);
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

  var x;
  var y;
  if (typeof neuron.parent !== undefined) {  // if neuron has a parent, get the parent's co-ords to animate to there
    x = self.activeScene[neuron.parent.id].rect.attrs.x + self.activeScene[neuron.parent.id].rect.attrs.width / 2;
    y = self.activeScene[neuron.parent.id].rect.attrs.y + self.activeScene[neuron.parent.id].rect.attrs.height / 2;
  } else {                                          // simply animate the neuron to its own centre
    x = self.activeScene[neuron.id].rect.attrs.x;
    y = self.activeScene[neuron.id].rect.attrs.y;
  }

  // remove connecting lines
  // todo: animate these out
  if (typeof self.connections[neuron.id] !== 'undefined') {
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
  // if there is another neuron to animateRemove
  if (iteration + 1 < neurons.length) {
    setTimeout(function() {
      self.animateRemove(neurons, callback, iteration + 1);
    }, 100);
  }
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
  this.renderingNeuron = neuron;
  this.renderingScene = neuron.scene;

  this.greatestX = 0, this.lowestX = 100, this.greatestY = 0, this.lowestY = 100;
  var animations = { remove: [], anchor: [], move: [], add: [] };

  // todo: change animation so it goes:
  // 1. remove any child nodes
  // 2. dock current active to its parent if appropriate
  // 3. move entire structure so active is in its new position
  // 4. resize active

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
        var offsetX = self.activeScene[self.renderingNeuron.id].x - self.renderingScene[self.renderingNeuron.id].x;
        var offsetY = self.activeScene[self.renderingNeuron.id].y - self.renderingScene[self.renderingNeuron.id].y;

        async.eachOf(self.activeScene, function(neuron, neuronId, nextNeuron) {
          if (typeof self.renderingScene[neuronId] !== 'undefined') {   // if neuron exists in activeScene and renderingScene, it needs to be moved
           
            animations.anchor.push({
              id: neuronId,
              x: (self.renderingScene[neuronId].x - (self.renderingScene[neuronId].width / 2) + offsetX) * self.widthSF,
              y: (self.renderingScene[neuronId].y - (self.renderingScene[neuronId].width / 2) + offsetY) * self.heightSF,
              width: self.renderingScene[neuronId].width * self.widthSF,
              height: self.renderingScene[neuronId].width * self.heightSF
            });

            animations.move.push({
              id: neuronId,
              x: (self.renderingScene[neuronId].x  - (self.renderingScene[neuronId].width / 2)) * self.widthSF,
              y: (self.renderingScene[neuronId].y  - (self.renderingScene[neuronId].width / 2)) * self.heightSF,
              width: self.renderingScene[neuronId].width * self.widthSF,
              height: self.renderingScene[neuronId].width * self.heightSF   // todo: put proper height here
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
        self.animateMove(animations.anchor, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // move whole structure to new position (new scene)
      if (animations.move.length > 0) {
        self.animateMove(animations.move, function() {
          callback();
        });
      } else callback();
    },
    function(callback) {  // determine which neurons need to be added to scene
      async.eachOf(self.renderingScene, function(neuron, neuronId, nextId) {
        self.updateBoundingPoints(neuronId);
        if (typeof self.activeScene[neuronId] === 'undefined') animations.add.push(neuronId);
        nextId();
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
    self.activeNeuron = neuron;
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
  this.render(this.activeNeuron);
  // todo: dealing with responsive?
};

//-------------------------
// Map.updateBoundingPoints(n, scene)
// -
// keeps track of the greatest and lowest x and y co-ords of neurons in scene
// n = neuron id, scene = currently rendering scene
//-------------------------
Map.prototype.updateBoundingPoints = function(neuronId) {
  var scene = this.renderingScene;
  // keep track of the leftmost, rightmost, uppermost and lowermost bounds of the display.
  if (this.greatestX < scene[neuronId].x + (scene[neuronId].width / 2)) this.greatestX = scene[neuronId].x + (scene[neuronId].width / 2);
  if (this.lowestX > scene[neuronId].x - (scene[neuronId].width / 2)) this.lowestX = scene[neuronId].x - (scene[neuronId].width / 2);
  if (this.greatestY < scene[neuronId].y + (scene[neuronId].width / 2)) this.greatestY = scene[neuronId].y + (scene[neuronId].width / 2);  // todo: swap in the actual height
  if (this.lowestY > scene[neuronId].y - (scene[neuronId].width / 2)) this.lowestY = scene[neuronId].y - (scene[neuronId].width / 2);    // todo: swap in the actual height 
}