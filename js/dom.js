// dom.js - set up required elements in dom, apply required styles to <body> and <html>
module.exports = function(Conscipt) {

  Conscipt.prototype.initDom = function() {
    var config = this.config;

    // style <body> and <html> tags in case they are consciptDiv's parents
    document.body.style.height = config.dom.bodyHeight;
    document.body.style.margin = config.dom.bodyMargin;
    document.documentElement.style.height = config.dom.htmlHeight;

    // get or create consciptDiv
    var consciptDiv = document.getElementById(config.dom.consciptId);
    if (!consciptDiv) {
      var consciptDiv = document.createElement("DIV");
      consciptDiv.id = config.dom.consciptId;
      document.body.appendChild(consciptDiv);
    }
    consciptDiv.style.height = config.dom.consciptHeight;
    consciptDiv.style.width = config.dom.consciptWidth;

    // create div for Raphael paper to be placed in
    config.dom.paperDivId = config.dom.consciptId + "-paper";
    var paperDiv = document.createElement("DIV");
    paperDiv.id = config.dom.paperDivId;
    consciptDiv.appendChild(paperDiv);

    // create div for Resource content to be placed in
    config.dom.resourceDivId = config.dom.consciptId + "-resource";
    var resourceDiv = document.createElement("DIV");
    resourceDiv.id = config.dom.resourceDivId;
    consciptDiv.appendChild(resourceDiv);

    // todo: think about abstracting out the creation of content divs so they
    // can be requested by other modules etc...
  };

};
