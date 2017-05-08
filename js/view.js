// view.js

var dom = require('./dom');

module.exports = View;

// view constructor
function View(parent, viewDivId, containerDivId) {
  
  this.parent = parent;
  
  // create div in dom
  this.div = dom.addChildDiv({
    "id": viewDivId,
    "parent": containerDivId,
    "style": {
      "display": "none",
      "height": "100%",
      "left": "50%",
      "position": "absolute",
      "top": "0",
      "width": "50%"
    }
  });

  this.content = [];

};

View.prototype.clearAndHide = function() {
  // todo: insert code to destroy all elements that make this resource view
  this.div.style.display = "none";
};

View.prototype.render = function(content) {
  console.log(content);
};