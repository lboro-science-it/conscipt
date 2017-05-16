// view.js

var dom = require('./dom');

var async = require('async');
var katex = require('katex');


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
      "padding": "2em",
      "position": "absolute",
      "top": "0",
      "width": "50%"
    }
  });

  this.visible = false;

  this.content = [];

};

View.prototype.clear = function(callback) {
  while(this.div.firstChild) {
    this.div.removeChild(this.div.firstChild);
  }
  callback();
};

View.prototype.hide = function(callback) {
  var self = this;
  var div = this.div;
  var fadeOutEffect = setInterval(function() {
    if (!div.style.opacity) div.style.opacity = 1;
    if (div.style.opacity == 0) {
      clearInterval(fadeOutEffect);
      div.style.display = "none";
      self.visible = false;
      callback();
    }
    else div.style.opacity -= 0.1;
  }, 50);
};

View.prototype.render = function(neuron) {
  var self = this;
  var content = neuron.resource;

  async.eachOf(content, function(component, index, nextComponent) {   // iterate the components in the neuron's resource
    var div = dom.addChildDiv({        // create a div for each component
      "id": neuron.id + "-resource-" + index,
      "parent": self.div.id,
      "style": {
        "font-family": "arial",
        "padding": "1em"
      }

    });
    if (typeof component === "string") {    // treat strings as html
      div.innerHTML = component;            // put the html in the div
    } else if (typeof component === "object") {    // object could be latex, qblock
      for (var type in component) {         // test what type of component it is
        var content = component[type];
        if (type == "latex") {                              // latex component
          div.innerHTML = katex.renderToString(content);
        } else if (type == "qblock") {                      // qblock component
          var qBlockHeading = dom.addChildDiv({             // create a heading div
            "id": div.id + "-qblock-heading",
            "parent": div.id
          });
          var qTitle = document.createElement("H3");        // h3 for the title in the heading div
          qTitle.innerHTML = content.qtitle;
          qBlockHeading.appendChild(qTitle);

          var qBlock = document.createElement("OL");        // ol for the actual question and answers to go in
          qBlock.id = div.id + "-qblock-content";
          div.appendChild(qBlock);

          for (var i = 0; i < content.qs.length; i++) {     // iterate the questions
            var qRow = document.createElement("LI");        // add a li for the question (and answer)
            qRow.id = qBlock.id + "-q-" + (i + 1);
            qRow.style["padding-top"] = "1em";

            var qPart = document.createElement("DIV");
            qPart.id = qRow.id + "-text";
            qPart.style.width = "40%";
            qPart.style.display = "inline-block";

            qRow.appendChild(qPart);
            for (var qType in content.qs[i]) {              // test what type of question it is
              if (qType == "latex") {
                qPart.innerHTML += katex.renderToString(content.qs[i][qType]);
              } else {    // just treat it as html
                qPart.innerHTML += content.qs[i][qType];
              }
            }

            var aPart = document.createElement("DIV");
            aPart.id = qBlock.id + "-a-" + (i + 1);
            aPart.style.display = "inline-block";

            qRow.appendChild(aPart);
            for (var aType in content.as[i]) {              // test what type of answer it is
              if (aType == "latex") {
                aPart.innerHTML += katex.renderToString(content.as[i][aType]);
              } else {    // just treat it as html
                aPart.innerHTML += content.as[i][aType];
              }
            }

            qBlock.appendChild(qRow);
          }
        }
      }
    }
    nextComponent();
  }, function() { // all components are in the div
    self.show();
  });
};

View.prototype.show = function() {
  var self = this;
  var div = this.div;

  var fadeInEffect = setInterval(function() {
    if (!div.style.opacity) {
      div.style.opacity = 0;
    }
    if (div.style.opacity == 1) {
      div.style.display = "block";
      self.visible = true;
      clearInterval(fadeInEffect);
    } else {
      div.style.display = "block";
      div.style.opacity = parseFloat(div.style.opacity) + 0.1;
    }
  }, 50);

};