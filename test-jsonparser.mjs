import * as assert from "assert";
import jsonparser from "./jsonparser.js";

const debug = false;

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

    if (debug) {
        console.log("jsonObject",  jsonObject);
    }

    const jsonStr2 = `{ true: "hello" }`;
    try {
        jsonparser(jsonStr2);
    }
    catch (e) {
        assert.ok(e instanceof jsonparser.KeyTypeError);
        assert.ok(e.line === 0);
        assert.ok(e.column === 2);

        if (debug) {
            console.log("error generated", e);
        }
    }
};


test();

// End
