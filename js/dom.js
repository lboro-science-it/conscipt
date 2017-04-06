// dom.js - init dom based on config

// init dom based on config passed, creating elements as required
module.exports.init = function(config) {

  for (var elem in config) {
    if (typeof document[elem] !== 'undefined') {
      // elem exists in document so is body, documentElement, etc - apply the values to attr's props
      for (var attr in config[elem]) {
        for (var prop in config[elem][attr]) {
          document[elem][attr][prop] = config[elem][attr][prop];
        }
      }
    } else {
      // elem doesn't exist in document so we need see if it exists in dom and create if not
      for (var id in config[elem]) {
        var domElem = document.getElementById(id);
        if (!domElem) {
          var domElem = document.createElement(elem);
          domElem.id = id;
          if (typeof config[elem][id]["parent"] === 'undefined') document.body.appendChild(domElem);
          else {
            var parentElem = document.getElementById(config[elem][id]["parent"]);
            parentElem.appendChild(domElem);
          }
        }
        // now apply the values to attr's props
        for (var attr in config[elem][id]) {
          for (var prop in config[elem][id][attr]) {
            if (typeof domElem[attr] !== 'undefined')
            domElem[attr][prop] = config[elem][id][attr][prop];
          }
        }
      }
    }
  }
};

// addChildDiv(config)
// -
// adds a div with id = config.id to config.parent (if set) with config.styles
module.exports.addChildDiv = function(config) {
  if (typeof config.id !== 'undefined') {
    var domElem = document.getElementById(config.id);
    if (!domElem) {
      var domElem = document.createElement("DIV");
      domElem.id = config.id;
      if (typeof config.parent === 'undefined') document.body.appendChild(domElem);
      else {
        var parentElem = document.getElementById(config.parent);
        if (parentElem) parentElem.appendChild(domElem);
      }
    }
    if (typeof config.style !== 'undefined') for (var prop in config.style) {
      domElem.style[prop] = config.style[prop];
    }
    return domElem;
  }
};