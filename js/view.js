// view.js

var dom = require('./dom');

var async = require('async');
var katex = require('katex');

module.exports = View;

// view constructor
function View(parent, viewDivId, containerDivId) {
  this.parent = parent;

  this.viewContainerDiv = dom.addChildDiv({      // viewContainer div allows us to vertically centre the content
    "id": viewDivId + "-container",
    "parent": containerDivId,
    "style": {
      "left": "55%",
      "height": "100%",
      "position": "absolute",
      "top": "0",
      "visibility": "hidden",
      "width": "45%"
    }
  });

  this.contentDiv = dom.addChildDiv({         // div in which resource content will be drawn
    "id": viewDivId,
    "parent": this.viewContainerDiv.id,
    "style": {
      "position": "absolute",
      "top": "50%",
      "transform": "translateY(-50%)"
    }
  });

  this.visible = false;
  this.neuron = null;
  this.content = [];
};

View.prototype.clear = function(callback) {
  while(this.contentDiv.firstChild) {
    this.contentDiv.removeChild(this.contentDiv.firstChild);
  }
  if (callback) callback();
};

View.prototype.hide = function(callback) {
  var self = this;
  var div = this.viewContainerDiv;
  var fadeOutEffect = setInterval(function() {
    if (!div.style.opacity) div.style.opacity = 1;
    if (div.style.opacity <= 0) {
      clearInterval(fadeOutEffect);
      div.style.visibility = "hidden";
      self.visible = false;
      if (callback) callback();
    }
    else div.style.opacity -= 0.1;
  }, 20);
};

View.prototype.getComponentDiv = function(index) {
  return dom.addChildDiv({
    "id": this.neuron.id + "-resource-" + index,
    "parent": this.contentDiv.id,
    "style": {
      "font-family": "arial",
      "padding-top": "1em"
    }
  });
}

function getComponentType(component) {
  if (typeof component === "string") {
    return "string";
  } else {
    for (var type in component) {
      return type;
      break;
    }
  }
}

function getComponentContent(component) {
  if (typeof component === "string") {
    return component;
  } else {
    for (var type in component) {
      return component[type];
      break;
    }
  }
}

function appendTitle(div, content) {
  var titleDiv = dom.addChildDiv({
    "id": div.id + "-title",
    "parent": div.id
  });

  var titleElem = document.createElement("H1");
  titleElem.id = div.id + "-title";

  for (var i = 0; i < content.length; i++) {
    var titleSpan = document.createElement("SPAN");
    titleSpan.style["padding-right"] = "0.5em";
    var tType = getComponentType(content[i]);
    var tContent = getComponentContent(content[i]);

    if (tType == "latex") {
      titleSpan.innerHTML += katex.renderToString(tContent);
    } else {
      titleSpan.innerHTML += tContent;
    }

    titleElem.appendChild(titleSpan);
  }

  div.appendChild(titleElem);
};

function appendQBlock(div, content) {                   
  var qBlockHeader = dom.addChildDiv({                    // header of the q block
    "id": div.id + "-qblock-header",
    "parent": div.id
  });

  var qTitle = document.createElement("H3");              // put the qtitle in a h3 tag
  qTitle.innerHTML = content.qtitle;
  qBlockHeader.appendChild(qTitle);

  var qBlock = document.createElement("OL");              // create ordered list for questions
  qBlock.id = div.id + "-qblock-content";
  div.appendChild(qBlock);

  for (var i = 0; i < content.qs.length; i++) {           // create a row for each question
    var qRow = document.createElement("LI");
    qRow.id = qBlock.id + "-q-" + (i + 1);
    qRow.style["padding-top"] = "1em";
    qBlock.appendChild(qRow);

    var qPart = document.createElement("DIV");
    qPart.id = qRow.id + "-text";
    qPart.style.width = "40%";
    qPart.style.display = "inline-block";
    qPart.style.cursor = "pointer";
    qRow.appendChild(qPart);

    var qType = getComponentType(content.qs[i]);
    var qContent = getComponentContent(content.qs[i]);
    if (qType == "latex") {
      qPart.innerHTML += katex.renderToString(qContent);
    } else {
      qPart.innerHTML += qContent;
    }

    var aContainer = document.createElement("DIV");         // container for instructional text + answer
    aContainer.id = qBlock.id + "-a-container-" + (i + 1);
    aContainer.style.display = "inline-block";
    aContainer.style["vertical-align"] = "top";
    aContainer.style.width = "50%";
    qRow.appendChild(aContainer);

    var iPart = document.createElement("DIV");              // instructional part
    aContainer.appendChild(iPart);
    iPart.id = qBlock.id + "-i-" + (i + 1);
    iPart.style.position = "absolute";
    iPart.style.display = "inline-block";
    iPart.innerHTML = "(click to reveal)";
    iPart.style.paddingTop = ((qPart.offsetHeight - iPart.offsetHeight) / 2) + "px";

    var aPart = document.createElement("DIV");
    aPart.id = qBlock.id + "-a-" + (i + 1);
    aPart.style.display = "inline-block";
    aPart.style.visibility = "hidden";
    aPart.style.position = "absolute";
    aContainer.appendChild(aPart);

    qPart.setAttribute('a-part', aPart.id);

    var aType = getComponentType(content.as[i]);
    var aContent = getComponentContent(content.as[i]);
    if (aType == "latex") {
      aPart.innerHTML += katex.renderToString("=" + aContent);
    } else {
      aPart.innerHTML += aContent;
    }

    qPart.addEventListener('click', function() {
      var aPart = document.getElementById(this.getAttribute('a-part'));

      aPart.style.visibility = "";
      aPart.style.opacity = 0;
      var fadeIn = setInterval(function() {
        if (aPart.style.opacity >= 1) {
          clearInterval(fadeIn);
        } else {
          aPart.style.opacity = parseFloat(aPart.style.opacity) + 0.1;
        }
      }, 50);
    });
  }
};

View.prototype.render = function(neuron) {
  var self = this;
  this.neuron = neuron;

  var content = neuron.resource;

  async.eachOf(content, function(component, index, nextComponent) {   // iterate the components in the neuron's resource
    var div = self.getComponentDiv(index);

    var type = getComponentType(component);
    var content = getComponentContent(component);

    switch (type) {
      case "string":
        div.innerHTML = content;
        break;
      case "latex":
        div.innerHTML = katex.renderToString(content);
        break;
      case "title":
        appendTitle(div, content);
        break;
      case "qblock":
        appendQBlock(div, content);
        break;
    }

    nextComponent();
  }, function() { // all components are in the div

    self.show();
  });
};

View.prototype.show = function() {
  var self = this;
  var div = this.viewContainerDiv;
  self.visible = true;
  if (!div.style.opacity) {
    div.style.opacity = 0;
  }
  div.style.visibility = "";

  var fadeInEffect = setInterval(function() {
    if (div.style.opacity >= 1) {
      clearInterval(fadeInEffect);
    } else {
      div.style.opacity = parseFloat(div.style.opacity) + 0.1;
    }
  }, 50);

};