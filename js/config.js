// default config will be exposed for user to overwrite in config
var defaults = {
  "rootNode": "1",
  "scene": {
    "activeX": 50,          // active neuron position
    "activeY": 50,          // active neuron position
    "activeWidth": 10,      // active neuron width (% of container)
    "childWidth": 10,       // child neuron width (% of container)
    "boundingWidth": 50,    // active neuron child plot bounding box width
    "boundingHeight": 50,   // active neuron child plot bounding box height
    "hierarchyWidth": 15,   // hierarchical neuron child plot bounding box width
    "hierarchyHeight": 15,  // hierarchical neuron child plot bounding box height
    "parentWidth": 2,       // parent neuron width (% of container)
    "parentDepth": 2,       // how many layers of parents to show
    "childDepth": 1         // number of layers of children to show
  },
  "dom": {
    "bodyHeight": "100%",
    "bodyMargin": "0",
    "htmlHeight": "100%",
    "consciptDivHeight": "100%",
    "consciptDivWidth": "100%",
    "consciptDivId": "conscipt"
  }
};

module.exports = defaults;