# conscipt
Dynamically render maths concept maps which resize to fit the screen

Conscipt is the result of a project to make maths resources more accessible for students with dyslexia. Given a JavaScript configuration object of hierarchical 'neurons', the library will calculate the concept map structure and render in such as way as to keep the structure visible on screen.

## Usage
Edit the JavaScript object passed to Conscipt in `index.html`. The default 'scene' configurations allow 2 generations of ancestor elements to be visible at any one time, any more and it's going to shrink too much to be useful.
