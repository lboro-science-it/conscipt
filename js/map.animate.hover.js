// map.animate.hover.js - functions to manage hovering

var async = require('async');

module.exports = function(Map) {

  Map.prototype.addNeuronHover = function(neuron) {
    neuron.rect.data("map", this).data("type", "rect").hover(ziiHover, ziiUnhover);
    for (var row in neuron.title) {
      neuron.title[row].text.data("type", "text").data("rect", neuron.rect).hover(ziiHover, ziiUnhover);
      if (neuron.title[row].div) {
        var div = neuron.title[row].div;
        var text = neuron.title[row].text;
        div.addEventListener("mouseover", latexMouseOver = function() {
          // todo: below is a hack; really the eventListener should only be being called when there are text events, however we can't successfully remove the event listener yet
          if (text.events) text.events[text.events.length - 2].f.call(text);
        });
        div.addEventListener("mouseout", latexMouseOut = function() {
          if (text.events) text.events[text.events.length - 1].f.call(text);
        });
      }
    }
  }

  Map.prototype.removeNeuronHover = function(neuron) {
    neuron.rect.unhover(ziiHover, ziiUnhover);
    neuron.rect.removeData("map").removeData("originX").removeData("originY").removeData("originW").removeData("originH").removeData("state");
    for (var row in neuron.title) {
      neuron.title[row].text.unhover(ziiHover, ziiUnhover);
      neuron.title[row].text.removeData();
      if (neuron.title[row].div) {
        var div = neuron.title[row].div;
        div.removeEventListener("mouseover", latexMouseOver);
        div.removeEventListener("mouseout", latexMouseOut);
      }
    }
  }

};

// can be called from either a rect onHover or a text (title row) onHover
function ziiHover() {
  var rect = this.data("type") == "rect" ? this : this.data("rect");    // rect contains rect whether caller is rect or text
  var self = rect.data("map");                                          // self = conscipt instance that caller belongs to
  
  if (!self.rendering && !this.data("hovering")) {              // only think about hover stuff if not rendering

    this.data("hovering", true);                                          // unhover checks whether the rect or its title elems are being hovered
    var neuron = self.activeScene[rect.data("neuronId")];                 // neuron obj in activeScene contains details of title

    var state = (!rect.data("state")) ? "origin" : rect.data("state");    // rect state will be origin unless it has been set elsewhere

    if (state == "origin") {
      rect.data("originX", rect.attrs.x);
      rect.data("originY", rect.attrs.y);
      rect.data("originW", rect.attrs.width);
      rect.data("originH", rect.attrs.height);
      for (var row in neuron.title) {
        var text = neuron.title[row].text;
        text.data("finalX", text.attrs.x);
        text.data("finalY", text.attrs.y);
      }
    }

    if (state == "hoverOut") rect.stop();                                 // interupt unhovering animation

    if (state == "origin" || state == "hoverOut") {   // if in origin or hoverOut we need to animate to hover position
      rect.data("state", "hoverIn");                        // store the fact we are now animating the hover in
      var rectToWidth = self.scaleX(self.parent.config.scene.child.width);      // calc new width based on size of a child neuron
      var rectToHeight = self.scaleY(self.parent.config.scene.child.lineHeight) * neuron.title.length + 1;    // new height based on a child neuron + this neuron's title

      var rectToX = (rect.attrs.x + rect.attrs.width / 2) - rectToWidth / 2;
      var rectToY = (rect.attrs.y + rect.attrs.height / 2) - rectToHeight / 2;

      rect.toFront().animate({
        "x": rectToX,
        "y": rectToY,
        "width": rectToWidth,
        "height": rectToHeight
      }, self.parent.config.animations.hover.duration, "linear", function() {
        rect.data("state", "hovered");
      });

      async.each(neuron.title, function(row) {                    // before animating we take a copy of what its size is supposed to be
        var text = row.text;
        text.attrs.x = rectToX + rectToWidth / 2;                 // move the text elem to the middle of the rect
        text.attrs.y = rectToY + rectToHeight / 2;                // move the text elem to the middle of the rect
        var fontSize = self.scaleY(self.parent.config.scene.child.lineHeight / 2);
        var opacity = 1;
        var duration = self.parent.config.animations.hover.duration;

        if (row.div) {      // row has latex div 
          var fontSizeDiff = parseFloat(row.div.style.fontSize) - fontSize;       // we use to track animating from 0 to target fontsize
          var opacityDiff = row.div.style.opacity - opacity;                      // track animating form 0 to 1
          var fromX = parseFloat(row.div.style.left) + row.div.offsetWidth / 2;   // need to check whether these start at the right place, presumably yes
          var fromY = parseFloat(row.div.style.top) + row.div.offsetHeight / 2;   // and are just invisible?
          var toX = text.data("finalX");
          var toY = text.data("finalY");
          var start = null;
          function hoverLatexStep(timestamp) {
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
              window.requestAnimationFrame(hoverLatexStep);
            } else {
              row.div.style.fontSize = fontSize + "px";
              row.div.style.opacity = opacity;
              row.div.style.left = toX - row.div.offsetWidth / 2;
              row.div.style.top = toY - row.div.offsetHeight / 2;
            }
          }
          window.requestAnimationFrame(hoverLatexStep);
        }
        text.toFront().animate({
          "x": text.data("finalX"),
          "y": text.data("finalY"),
          "opacity": opacity,
          "font-size": fontSize
        }, duration, "linear");

      });

    }
  }
};

function ziiUnhover() {
  var rect = this.data("type") == "rect" ? this : this.data("rect");
  var self = rect.data("map");

  this.removeData("hovering");
  var neuron = self.activeScene[rect.data("neuronId")];

  setTimeout(function() {
    var state = (!rect.data("state")) ? "origin" : rect.data("state");
    if (state != "origin") {                // can only unhover if we have in fact been hovering
      var hovering = (!rect.data("hovering")) ? false : true;         
      if (!hovering) {                        // test whether ANY of the elems are being hovered.
        for (var row in neuron.title) {
          var hovering = (!neuron.title[row].text.data("hovering")) ? hovering : true;
        }
      }
      if (!hovering) {  // none of the elems are being hovered so we can animate back to origin state
        if (state == "hoverIn") rect.stop();
        var rectMidX = rect.data("originX") + rect.data("originW") / 2;
        var rectMidY = rect.data("originY") + rect.data("originH") / 2;
        rect.data("state", "hoverOut");
        rect.animate({
          "x": rect.data("originX"),
          "y": rect.data("originY"),
          "width": rect.data("originW"),
          "height": rect.data("originH")
        }, self.parent.config.animations.hover.duration, "linear", function() {
          if (this.attrs.x == rect.data("originX")) {
            rect.removeData("state");
            rect.removeData("originX");
            rect.removeData("originY");
            rect.removeData("originW");
            rect.removeData("originH");
          }
        });

        async.each(neuron.title, function(row) {
          var text = row.text;
          if (row.div) {        // has latex
            var opacity = 0;
            var opacityDiff = row.div.style.opacity - opacity;                    // diff between starting and target opacity
            var start = null;
            var duration = self.parent.config.animations.hover.duration;
            function unhoverLatexStep(timestamp) {
              if (!start) start = timestamp;
              var progress = timestamp - start;
              if (progress < duration) {
                var percentRemaining = 1 - (progress / duration);
                row.div.style.opacity = opacity + (opacityDiff * percentRemaining);
                window.requestAnimationFrame(unhoverLatexStep);
              } else {
                row.div.style.opacity = opacity;
              }
            }
            window.requestAnimationFrame(unhoverLatexStep);
          }
          text.animate({
            "x": rectMidX,
            "y": rectMidY,
            "opacity": 0,
            "font-size": 0
          }, self.parent.config.animations.hover.duration, "linear", function() {
            this.attrs.x = this.data("finalX");
            this.attrs.y = this.data("finalY");
          });
        });

      }
    }
  }, 100);

}
