// map.animateAdd.js - extends map prototype with code to animate adding neurons

var dom = require('./dom');
var n = require('./neuron');

//var async = require('async');
var async = {};
async.eachSeries = require('async/eachSeries');
async.eachOf = require('async/eachOf');

var extend = require('extend');
var katex = require('katex/dist/katex.min.js');

module.exports = function(Map) {

  //---------------------------
  // Map.animateAdd(neurons, callback, iteration)
  // -
  // Works through neurons, an object of animation attributes, and after the last one, calls callback
  //---------------------------
  Map.prototype.animateAdd = function(neurons, callback) {
    var self = this;
    async.eachSeries(neurons, function(neuron, next) {
      var neuron = self.getNeuron(neuron);
      self.activeScene[neuron.id] = extend(true, {}, self.renderingScene[neuron.id]);

      self.animateAddRect(neuron, function() {
        self.animateAddTitle(neuron);
      });

      self.animateAddConnector(neuron);

      setTimeout(function() {
        next();
      }, self.parent.config.animations.add.interval);

    }, function() {
      setTimeout(function() {
        callback();     // all add animations are complete
      }, self.parent.config.animations.add.duration);
    });
  };

  Map.prototype.animateAddConnector = function(neuron, callback) {
    if (n.hasParent(neuron)) {  // only add connector if neuron has a parent
      var self = this;
      var parent = neuron.parent;

      var border;
      if (neuron.style) border = this.parent.config.styles[neuron.style]["border-color"] || "#000";
      else border = "#000";
      var borderWidth = this.parent.config.styles.default["border-width"] || 3;

      // connector from parent's centre to neuron's centre
      var fromX = this.rXC(parent);
      var fromY = this.rYC(parent);
      var toX = this.rXC(neuron);
      var toY = this.rYC(neuron);

      var initPathStruct = [        // directly creating the pathStruct means raphael doesn't have to
        ['M', fromX, fromY]
      ];
      var finalPathStruct = [
        ['M', fromX, fromY],
        ['L', toX, toY]
      ];

      this.activeScene[neuron.id].connector = this.canvas.path(initPathStruct)
      .attr({
        "stroke": border,
        "stroke-width": borderWidth,
        "pathlength": 0
      })
      .toBack();
      this.activeScene[neuron.id].connector.animate({
        path: finalPathStruct
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

        latexElem.setAttribute("neuron-id", neuron.id);   // stuff to enable us to access the raph elem from the div
        latexElem.setAttribute("title-row", index);       // on move, we then only need to create a single event and within that, iterate all necessary divs

        latexElem.innerHTML = katex.renderToString(customContent);
        latexElem.addEventListener('click', latexOnClick = function() {      // activate neuron's scene on click
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

  // register click handler for a raphael object to activate a neuron + set cursor
  Map.prototype.raphOnClickActivate = function(raphaelObj, neuron) {
    var self = this;
    raphaelObj.data("neuronId", neuron.id)
    .click(function() {
      self.parent.activate(self.getNeuron(this.data("neuronId")));
    })
    .hover(raphHover, raphUnHover);
  };

  function raphHover() {
    this.node.setAttribute("cursor", "pointer");
  };

  function raphUnHover() {
    this.node.setAttribute("cursor", "normal");
  }

};