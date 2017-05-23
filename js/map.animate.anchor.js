// map.animate.anchor.js - animates anchoring neurons before moving to a new position

var n = require('./neuron');

var async = require('async');

module.exports = function(Map) {

  Map.prototype.animateAnchor = function(animations, offsetX, offsetY, callback) {
    var self = this;

    async.each(animations, function(animation, next) {
      var neuron = self.activeScene[animation.id];
      self.activeScene[animation.id].role = self.renderingScene[animation.id].role;   // update role of neuron in activeScene

      self.animateAnchorTitle(animation, offsetX, offsetY);
      if (self.activeScene[neuron.parent]) {
        var parentAnimation = n.getAnimationByNeuronId(animations, neuron.parent);
        self.animateMoveConnector(animation, parentAnimation, offsetX, offsetY, "anchor");
      }
      self.animateMoveRect(animation, offsetX, offsetY, "anchor");
      next();
    }, function() {
      setTimeout(function() {
        if (callback) callback();
      }, self.parent.config.animations.anchor.duration);
    });
  };

  Map.prototype.animateAnchorTitle = function(neuronAnimation, offsetX, offsetY, animConfig) {
    var self = this;
    var neuron = this.activeScene[neuronAnimation.id];

    var toX = neuronAnimation.x + offsetX + (neuronAnimation.width / 2);    

    async.eachOf(neuron.title, function(row, index, nextRow) {
      var toY, fontSize, opacity;
      if (neuron.role == "zii") {
        opacity = 0;
        fontSize = 0;
        toY = neuronAnimation.y + offsetY + (neuronAnimation.height / 2);
      } else {
        var lineHeight = (neuronAnimation.height / neuron.title.length) - 1;
        toY = (neuronAnimation.y + (index * lineHeight) + 0.5 + (lineHeight / 2)) + offsetY;
        fontSize = lineHeight / 2;
        opacity = 1;
      }

      if (row.div) {
        var fontSizeDiff = parseFloat(row.div.style.fontSize) - fontSize;     // difference between starting and target font size
        var opacityDiff = row.div.style.opacity - opacity;                    // diff between starting and target opacity

        var fromX = parseFloat(row.div.style.left) + row.div.offsetWidth / 2;
        var fromY = parseFloat(row.div.style.top) + row.div.offsetHeight / 2;

        var start = null;
        var duration = self.parent.config.animations.anchor.duration;

        function anchorLatexStep(timestamp) {
          if (!start) start = timestamp;
          var progress = timestamp - start;
          if (progress < duration) {
            var percentRemaining = 1 - (progress / duration);

            row.div.style.fontSize = fontSize + (fontSizeDiff * percentRemaining) + "px";
            row.div.style.opacity = opacity + (opacityDiff * percentRemaining);

            var currentX = toX + ((fromX - toX) * percentRemaining);
            var currentY = toY + ((fromY - toY) * percentRemaining);

            row.div.style.left = currentX - (row.div.offsetWidth / 2) + "px";
            row.div.style.top = currentY - (row.div.offsetHeight / 2) + "px";

            window.requestAnimationFrame(anchorLatexStep);
          } else {
            row.div.style.fontSize = fontSize + "px";
            row.div.style.opacity = opacity;
            row.div.style.left = toX - row.div.offsetWidth / 2;
            row.div.style.top = toY - row.div.offsetHeight / 2;
          }
        }

        window.requestAnimationFrame(anchorLatexStep);
      }
      row.text.animate({
        "x": toX,
        "y": toY,
        "font-size": fontSize,
        "opacity": opacity
      }, self.parent.config.animations.anchor.duration, "linear");
      nextRow();
    });

  };

};