// view.js - functions related to displaying resources
module.exports = function(Conscipt) {

  // view div constructor - create div for viewing resources, add to dom
  function View(consciptDivId, viewDivId) {
    this.divId = viewDivId;
    var viewDiv = document.createElement("DIV");
    viewDiv.style.display = "inline-block";
    viewDiv.id = this.divId;
    var consciptDiv = document.getElementById(consciptDivId);
    consciptDiv.appendChild(viewDiv);
  }

  // constructor for View (accessible via Conscipt.View());
  Conscipt.prototype.View = function(viewName) {
    var consciptDivId = this.config.dom.consciptDivId;
    var viewName = viewName || "view";
    var viewDivId = consciptDivId + "-" + viewName;

    return new View(consciptDivId, viewDivId);
  };
};