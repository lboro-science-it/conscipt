// dom.js - set up required dom elements, apply required styles to <body> and <html>
module.exports = function(Conscipt) {
  // initDom can be called from any Conscipt instance
  Conscipt.prototype.initDom = function() {
    var config = this.config;
    // set <body> and <html> element heights to 100% by default
    document.body.style.height = config.dom.bodyHeight;
    document.body.style.margin = config.dom.bodyMargin;
    document.documentElement.style.height = config.dom.htmlHeight;
    // get or create consciptDiv
    var consciptDiv = document.getElementById(config.dom.consciptDivId);
    if (!consciptDiv) {
      var consciptDiv = document.createElement("DIV");
      consciptDiv.id = config.dom.consciptDivId;
      document.body.appendChild(consciptDiv);
    }
    // set consciptDiv height/width to 100% by default
    consciptDiv.style.height = config.dom.consciptDivHeight;
    consciptDiv.style.width = config.dom.consciptDivWidth;
    consciptDiv.style.textAlign = "center";

    // todo: think about abstracting out the creation of content divs so they
    // can be requested by other modules etc...
  }

};
