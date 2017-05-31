// map.animate.anchor.js - animates anchoring neurons before moving to a new position

var n = require('./neuron');

var async = require('async');

module.exports = function(Map) {

  Map.prototype.animateAnchor = function(animations, offsetX, offsetY, callback) {
    var self = this;

    async.each(animations, function(animation, next) {
      var neuron = self.activeScene[animation.id];

      if (self.rRole(neuron) == "zii" && self.aRole(neuron) != "zii") self.addNeuronHover(neuron);    // add hover to neurons becoming zii
      if (self.aRole(neuron) == "zii" && self.rRole(neuron) != "zii") self.removeNeuronHover(neuron); // remove hover from no-longer zii
      neuron.role = self.rRole(neuron);   // update role of neuron in activeScene
      
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

      var fontSize = 0, opacity = 0;
      var lineHeight = (neuronAnimation.height / neuron.title.length) - 1;
      var toY = (neuronAnimation.y + (index * lineHeight) + 0.5 + (lineHeight / 2)) + offsetY;

      if (neuron.role != "zii") {
        fontSize = lineHeight / 2;
        opacity = 1;
      }

      if (row.div) latexDivAnimate(row.div, toX, toY, fontSize, opacity, self.parent.config.animations.anchor.duration);

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

function latexDivAnimate(div, x, y, fontSize, opacity, duration) {
  var fontSizeDiff = parseFloat(div.style.fontSize) - fontSize;     // difference between starting and target font size
  var opacityDiff = div.style.opacity - opacity;                    // diff between starting and target opacity

  var fromX = parseFloat(div.style.left) + div.offsetWidth / 2;
  var fromY = parseFloat(div.style.top) + div.offsetHeight / 2;

  var start = null;

  function anchorLatexStep(timestamp) {
    if (!start) start = timestamp;
    var progress = timestamp - start;
    if (progress < duration) {
      var percentRemaining = 1 - (progress / duration);

      div.style.fontSize = fontSize + (fontSizeDiff * percentRemaining) + "px";
      div.style.opacity = opacity + (opacityDiff * percentRemaining);

      var currentX = x + ((fromX - x) * percentRemaining);
      var currentY = y + ((fromY - y) * percentRemaining);

      div.style.left = currentX - (div.offsetWidth / 2) + "px";
      div.style.top = currentY - (div.offsetHeight / 2) + "px";

      window.requestAnimationFrame(anchorLatexStep);
    } else {
      div.style.fontSize = fontSize + "px";
      div.style.opacity = opacity;
      div.style.left = x - div.offsetWidth / 2;
      div.style.top = y - div.offsetHeight / 2;
    }
  }
  window.requestAnimationFrame(anchorLatexStep);
}