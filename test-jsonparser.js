const assert = require("assert");
const jsonparser = require("./jsonparser.js");

const test = function () {
    const jsonStr = `{
  "a": "1",
  "b": {
    "c": "12",
    "d": "13"
  } 
}`;
    const jsonObject = jsonparser(jsonStr);
    assert.deepStrictEqual(JSON.parse(jsonStr), jsonObject.valueOf());
};


test();

// End
