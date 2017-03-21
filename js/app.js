var Raphael = require('raphael');
var $ = require('jquery');
/*
module.exports.init = function() {
  var paper = Raphael(0,0,500,500);
  var circle = paper.circle(50,50,50);
};
*/


// insert definition of conscipt object which can be accessed from the browser to achieve desired results.

var Conscipt = function(config) {
  var paper = Raphael(0,0,500,500);
  var circle = paper.circle(50,50,50);
};


module.exports = Conscipt;
