# A loss-less JSON parser

Another JSON parser??

All of the JSON parsers I found focussed on producing natural
JavaScript data structures from JSON, instead of correctly modelling
the JSON document in Javascript.

What that means is that the line and column locations of elements in
JSON documents is lost once a syntactically correct document is
produced.

This, in turn, prevents good schema based editors from working
easily. Because schema parsers tend to do their work on natural
Javascript structures like Javascript Objects or Arrays.

So this parser is about that. It does not automatically return
Javascript Objects or Arrays. Instead it produces an object that can
then be turned into it's natural Javascript form.

For example:

```javascript
{
  "a": "1",
  "b": {
    "c": "12",
    "d": "13"
  } 
}
```

Becomes:

```javascript
ObjectValue {
  type: 'object',
  elements:
   { a: { [String: '1'] line: 1, column: 7, type: 'string' },
     b:
      ObjectValue { type: 'object', elements: {
        c: { [String: '12'] line: 3, column 9, type: 'string' },
        d: { [String: '13'] line: 4, column 9, type: 'string' }
      }, line: 2, column: 7 } },
  line: 0,
  column: 0 }
```

## Example

How to program with it? Well, for example, in Node:

```javascript
const jsonparser = require("nics-jsonparser");

const jsonDocument = jsonparser(`{
   "a": "10",
   "b": "20",
   "c": [
      "hello",
      "world",
      "goodbye"
   ]
}`);

const data = jsonDocument.valueOf();

data.a === "10";                          // natural object
jsonDocument.get("a") == "10";            // note the `==` to get effective equal
jsonDocument.get("a").valueOf() === "10"; // parser objects only

jsonDocument.get("a").line === 1;
jsonDocument.get("b").line === 2;
jsonDocument.get("b").column === 8;       // start of the quote for "20"

data.c[1] === "world";
jsonDocument.get("c").get(1) == "world";
```


## Objects returned

JSON strings, including keys, are Javascript `String` objects with a
`type` property of `"string"` and a `line` and `column` property.

JSON boolean types, which are the `true` and `false` identifiers in
the Javascript language are supported as `Boolean` types but with the
additional properties of `line` and `column`.

JSON object types, which are key: value sets are `ObjectValue` types
which have the following methods:

* `get(key)` given a key in the map, returns the representation of the
  value
  
* `set(key, value)` sets key to be value - but value and key must be
  parser types, not just any value

* `valueOf()` returns a Javascript native `Object` representation of
  this `ObjectValue`.
  
In addition the `line` and `column` properties are supported.

JSON array types, which are dynamically extendable lists of values,
are `ArrayValue` types which have the following methods:

* `get(index)` returns the value stored at the index `index`

* `push(element)` pushes `element` onto the end of the array, but
  `element` should be a parser type, not a native Javascript type
  
* `valueOf()` returns a Javascript native `Array` representation of
  this `ArrayValue`.
  
In addition, `line` and `column` properties are supported as well as
the `length` propertym which always states the count of the actual
elements in the `ArrayValue`.


JSON numeric types are *not currently supported* by the parser.


## How the source files are arranged

[parser.js](parser.js) is the implementation of the parser; it exposes
a lot of functions for the purposes of testing.

[jsonparser.js](jsonparser.js) imports parser.js and exposes a simple
one function interface that parses JSON in a string.

