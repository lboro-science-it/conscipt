// map.geometry.js - contains functions related to geometry to extend the Map prototype

module.exports = function(Map) {

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

  // function that takes a percentage x (as defined in neuron scenes) and returns the position based on scaling factor
  Map.prototype.scaleX = function(x) {
    return x * this.widthSF;
  };

  // return y co-ord based on scaling factor based on height of screen
  Map.prototype.scaleY = function(y) {
    return y * this.heightSF;
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

};