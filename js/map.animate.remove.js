// map.animate.remove.js

var n = require('./neuron');

var async = require('async');

module.exports = function (Map) {


  //------------------------
  // Map.animateRemove(neurons, callback, iteration)
  // -
  // Sequentially animate the removal of neurons, then call callback
  //------------------------
  Map.prototype.animateRemove = function(neurons, callback, iteration) {
    var self = this;
    var iteration = iteration || 0;
    var neuron = self.getNeuron(neurons[iteration]);     // neuron object of neuron to delete

    if (self.activeScene[neuron.id].role == "zii") self.removeNeuronHover(self.activeScene[neuron.id]);

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

      connector.node.setAttribute("width", 0);       // we will use the unused width attr to calculate the stroke-dasharray when we animate it

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
      this.unclick();
      this.unhover();
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
          row.div.removeEventListener('click', latexOnClick);
          row.div.parentNode.removeChild(row.div);
        }
        this.unclick();
        this.unhover();
        this.remove();
        if (index == neuronSceneObj.title.length - 1) nextRow();            // only move to callback once final animation is complete
      });
      if (index < neuronSceneObj.title.length - 1) nextRow();               // go directly to next row until final row
    }, function() {
      if (callback) callback();
    });
  };


};