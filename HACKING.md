# Hacking json-parser

Maybe you want to help make this better?


## How the source files are arranged

[parser.js](parser.js) is the implementation of the parser; it exposes
a lot of functions for the purposes of testing.

[jsonparser.js](jsonparser.js) imports parser.js and exposes a simple
one function interface that parses JSON in a string.


## Built source files

`parser.mjs` is built with common2es6, it's basically just parser.js
but in ES6 style following the nodejs convention of `.mjs` for ES6
modules.

`jsonparser.mjs` is built in the same way.

These files are both built with NPM:

```
$ npm run-script prepare
```

So be sure to do that if altering the code.


## Testing

Additionally a file in the source repository, `test-jsonparser.mjs`
tests the ES6 version of the json parser. 

That test is run with Node's `--experimental-modules` to ensure Node
will see it as an ES6 file.

