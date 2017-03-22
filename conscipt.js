(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// core class instance with merged config / defaults
var Conscipt = require('./js/core');

// modules providing Conscipt functionality
require('./js/examplemodule')(Conscipt);
require('./js/dom')(Conscipt);

module.exports = Conscipt;

if (typeof window !== 'undefined') {
  window.Conscipt = Conscipt;
}
},{"./js/core":3,"./js/dom":4,"./js/examplemodule":5}],2:[function(require,module,exports){
// default config will be exposed for user to overwrite in config
var defaults = {
  "dom": {
    "bodyHeight": "100%",
    "bodyMargin": "0",
    "htmlHeight": "100%",
    "consciptHeight": "100%",
    "consciptWidth": "100%",
    "consciptId": "conscipt"
  }
};

module.exports = defaults;
},{}],3:[function(require,module,exports){
var extend = require('extend');

var defaults = require('./config');

// constructor for a new Conscipt instance with merged defaults and config
function Conscipt(config) {
  _defaults = extend(true, {}, defaults);
  this.config = extend(true, _defaults, config);
  this.init();
}

// init routines
Conscipt.prototype.init = function() {
  this.initDom();
  // todo: init Raphael

  // var paperWidth = window.innerWidth;
  // var paperHeight = window.innerHeight;
  // var paper = Raphael(0, 0, paperWidth, paperHeight);
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
}

module.exports = Conscipt;
},{"./config":2,"extend":6}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
module.exports = function(Conscipt) {
  Conscipt.prototype.testmodule = function() {
    console.log("example module - this is how to extend functionality of Conscipt object from modules");
  };
};
},{}],6:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {/**/}

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}]},{},[1]);
