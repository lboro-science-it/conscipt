// map.animate.move.js - animates moving neurons in a scene

var n = require('./neuron');

//var async = require('async');
var async = {};
async.each = require('async/each');
async.eachOf = require('async/eachOf');

module.exports = function(Map) {
  //---------------------------
  // Map.animateMove(animations, callback)
  // -
  // Works through neurons, an object of animation attributes, and after the last one, calls callback
  //---------------------------
  Map.prototype.animateMove = function(animations, offsetX, offsetY, callback) {
    var self = this;

    async.each(animations, function(animation, next) {
      var neuron = self.activeScene[animation.id];
      var renderingNeuron = self.renderingScene[animation.id];
      neuron.role = renderingNeuron.role;
      neuron.x = renderingNeuron.x;
      neuron.y = renderingNeuron.y;
      neuron.width = renderingNeuron.width;
      neuron.height = renderingNeuron.height;

      self.animateMoveTitle(animation, offsetX, offsetY);
      if (self.activeScene[neuron.parent]) {
        var parentAnimation = n.getAnimationByNeuronId(animations, neuron.parent);
        self.animateMoveConnector(animation, parentAnimation, offsetX, offsetY, "move");
      }
      self.animateMoveRect(animation, offsetX, offsetY, "move");

      next();
    }, function() {
      setTimeout(function() {
        if (callback) callback();
      }, self.parent.config.animations.move.duration);
    });
  };

  //-----------------------------
  // Map.animateMoveConnector(neuronAnimation, offsetX, offsetY)
  // -
  // Animate the move of the connector. neuronAnimation contains the co-ords the connector's neuron will end up at. Also need to consider where the parent will end up.
  //-----------------------------
  Map.prototype.animateMoveConnector = function(neuronAnimation, parentAnimation, offsetX, offsetY, animConfig) {
    var self = this;
    var neuron = this.activeScene[neuronAnimation.id];

    if (neuron.connector) {   // only try and animate connector if it definitely exists
      var fromX = parentAnimation.x + parentAnimation.width / 2 + offsetX;
      var fromY = parentAnimation.y + parentAnimation.height / 2 + offsetY;
      var toX = neuronAnimation.x + neuronAnimation.width / 2 + offsetX;
      var toY = neuronAnimation.y + neuronAnimation.height / 2 + offsetY;

      var pathStruct = [
        ['M', fromX, fromY],
        ['L', toX, toY]
      ];

      neuron.connector[0].style["stroke-dasharray"] = "9999px";       // ensures whole line is drawn when 'growing' lines

      neuron.connector.animate({
        path: pathStruct
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


  Map.prototype.animateMoveTitle = function(neuronAnimation, offsetX, offsetY) {
    var self = this;
    var neuron = this.activeScene[neuronAnimation.id];              // object through which to access raphael text elems etc
    
    var toX = neuronAnimation.x + offsetX + (neuronAnimation.width / 2);  // raphael x for text elem is always mid point of rect

    async.eachOf(neuron.title, function(row, index, nextRow) {      // iterate neuron.title[] - raphael text elem for each row of title
      
      if (neuron.role == "zii") {
        var lineHeight = self.scaleY(self.parent.config.scene.child.lineHeight);
        var ziiMid = neuronAnimation.y + neuronAnimation.height / 2;
        var hoverTop = ziiMid - (lineHeight * neuron.title.length + 1) / 2;
        var toY = (hoverTop + (index * lineHeight) + 0.5 + (lineHeight / 2)) + offsetY;
      } else {
        var lineHeight = (neuronAnimation.height / neuron.title.length) - 1;                  // 1 = padding, as neuron height = its lineHeight * number of title rows + 1
        var toY = (neuronAnimation.y + (index * lineHeight) + 0.5 + (lineHeight / 2)) + offsetY;    // y = top of rect + multiple lineHeights + half of padding + middle of line point + offset
      }
      
      if (row.div) {
        var start = null;
        var duration = self.parent.config.animations.move.duration;

        var fromX = parseFloat(row.div.style.left) + row.div.offsetWidth / 2;
        var fromY = parseFloat(row.div.style.top) + row.div.offsetHeight / 2;

        function moveLatexStep(timestamp) {
          if (!start) start = timestamp;
          var progress = timestamp - start;

          if (progress < duration) {
            var percentLeft = 1 - (progress / duration);

            var currentX = toX + ((fromX - toX) * percentLeft);
            var currentY = toY + ((fromY - toY) * percentLeft);

            row.div.style.left = currentX - (row.div.offsetWidth / 2) + "px";
            row.div.style.top = currentY - (row.div.offsetHeight / 2) + "px";
            
            window.requestAnimationFrame(moveLatexStep);

          } else {
            row.div.style.left = (toX - row.div.offsetWidth / 2) + "px";
            row.div.style.top = (toY - row.div.offsetHeight / 2) + "px";
          }
        };

        window.requestAnimationFrame(moveLatexStep);
      }

      row.text.animate({
        "x": toX,
        "y": toY
      }, self.parent.config.animations.move.duration, "linear");

      nextRow();
    });
  };
}
