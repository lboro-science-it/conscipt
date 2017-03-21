var Raphael = require('raphael');

var extend = require('extend');

var Conscipt = function(config) {

  var defaults = {
    "bodyHeight": "100%",
    "bodyMargin": "0",
    "htmlHeight": "100%",
    "consciptHeight": "100%",
    "consciptWidth": "100%",
    "consciptId": "conscipt"
  }

  // merge defaults with passed config
  config = extend(true, defaults, config);

  // todo: make following overwritable in config (i.e. defaults)
  // set body / html height so conscipt div potentially be 100% of viewport
  document.body.style.height = config.bodyHeight;
  document.body.style.margin = config.bodyMargin;
  document.documentElement.style.height = config.htmlHeight;

  // identify or create conscipt div
  var consciptDiv = document.getElementById(config.consciptId);
  if (!consciptDiv) {
    var consciptDiv = document.createElement("DIV");
    consciptDiv.id = config.consciptId;
    document.body.appendChild(consciptDiv);
  }
  consciptDiv.style.height = config.consciptHeight;
  consciptDiv.style.width = config.consciptWidth;

  // create paper for concept map rendering

  var paperDiv = document.createElement("DIV");
  paperDiv.id = "conscipt-paper";
  consciptDiv.appendChild(paperDiv);

  var resourceDiv = document.createElement("DIV");
  resourceDiv.id = "conscipt-resource";
  consciptDiv.appendChild(resourceDiv);

  var paperWidth = window.innerWidth;
  var paperHeight = window.innerHeight;
  var paper = Raphael(0, 0, paperWidth, paperHeight);
  // todo: enforce 16:9 ratio
  // todo: enforce paper positioning (centre on screen to start?)
  // todo: detecting small screen, portrait, landscape, config options



  // create resource rendering object

  // identify root node -> make it active (can be overriden)

  // all part of making a node active 
    // active node:
    // check if node has children or a resource (either / or)

    // calculate position or use override position - how this applies to display mode?
    // process title components?
    // cue for animating (from / to)

    // child nodes:
    // do a foreach on children/grandchildren etc (depending on config depth)
    // calculate position relative to parent -> do once - or use default
    // cue for animating (from / to)

    // resource components:
    // process components
    // cue for rendering / animating

  // if active node has resources then we should be drawing it to the side and resource main
  // template dependent
  // titles use component system
  // resources also use component system

  // events:
  // register onclick = make node active event
  // register other events according to component declarations (component module)
  // register onresize event which re-does the paper object, scaling factor, box size, connector size, etc



};

module.exports = Conscipt;