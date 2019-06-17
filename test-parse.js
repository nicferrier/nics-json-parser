const parse = require("./parser.js");
const assert = require("assert");

const tests = {
    testStream: function () {
        const stream = parse.streamFunc(`{
"a": "10",
"a longer key": "some longer values"
}`);
        const a = new Array(4);
        for (let i = 0; i < a.length; i++) {
            a[i] = stream.read();
        }
        assert.ok(a[0] == "{", `the value was: ${a[0]}`);
        assert.ok(a[0].line === 0);
        assert.ok(a[0].column === 0);

        assert.ok(a[2] == "\"");
        assert.ok(a[2].line === 1);
        assert.ok(a[2].column === 0);

        try {
            while (true) {
                stream.read();
            }
        }
        catch (e) {
            assert.ok(e instanceof parse.EOFError);
        }
    },

    testReadString: function () {
        const stream = parse.streamFunc(`"hello"`);
        const ch = stream.read();
        assert.ok(ch == '"');
        assert.ok(ch.line === 0);
        assert.ok(ch.column === 0);

        const parsedStr = parse.readString(ch, stream);
        assert.ok(parsedStr == "hello", `the value is: ${parsedStr}`);
        assert.ok(parsedStr.line === 0, `${parsedStr}`);
        assert.ok(parsedStr.column === 0);

        // Check that we can use a different starting quote and it will work
        const stream2 = parse.streamFunc(`'hello'`);
        const ch2 = stream2.read();
        assert.ok(ch2 == "'");
        assert.ok(ch2.line === 0);
        assert.ok(ch2.column === 0);

        const parsedStr2 = parse.readString(ch2, stream2);
        assert.ok(parsedStr2 == "hello", `the value is: ${parsedStr}`);

        // Check that we can have the different quote in it
        const stream3 = parse.streamFunc(`'hello "bob"'`);
        const ch3 = stream3.read();
        assert.ok(ch3 == "'");
        assert.ok(ch3.line === 0);
        assert.ok(ch3.column === 0);

        const parsedStr3 = parse.readString(ch3, stream3);
        assert.ok(parsedStr3 == "hello \"bob\"", `the value is: ${parsedStr}`);
    },

    testReadToken: function () {
        const stream = parse.streamFunc(`     "hello"`);
        const tokenStream = parse.tokenStream(stream);
        const str = tokenStream.next().value;
        assert.ok(str == "hello");
        assert.ok(str.line === 0);
        assert.ok(str.column === 5);

        const stream2 = parse.streamFunc(`{
  "hello": "greeting"
}`);
        const tokenStream2 = parse.tokenStream(stream2);
        const token1 = tokenStream2.next().value; // {
        const token2 = tokenStream2.next().value; // "hello"
        const token3 = tokenStream2.next().value; // :
        const token4 = tokenStream2.next().value; // "greeting"
        const token5 = tokenStream2.next().value; // "}"

        assert.ok(token1.char === "{", `token1: ${JSON.stringify(token1)}`);
        assert.ok(token2 == "hello", `token2: ${token2}`);
        assert.ok(token3.char === ":");
        assert.ok(token4 == "greeting");
        assert.ok(token5.char == "}");

        assert.ok(token5.line === 2);
        assert.ok(token5.column === 0);
    },

    testParseValue: function () {
        const stream = parse.streamFunc(`[
  "hello", 
  "ola", 
  true,
  "bonjour"
]`);
        const tokenStream = parse.tokenStream(stream);
        const value = parse.parseValue(tokenStream);

        assert.ok(value.length === 4, value.length);

        assert.deepStrictEqual(
            value.valueOf(), ["hello", "ola", true, "bonjour"]
        );
        assert.ok(value.get(1).line === 2);
        assert.ok(value.get(1).column === 2);

        assert.ok(value.get(2).valueOf() === true);
        assert.ok(value.get(2).line === 3);
        assert.ok(value.get(2).column === 2);

        const stream2 = parse.streamFunc(`[
  "hello", [
    "ola", 
    true
  ],
  "bonjour"
]`);
        const tokenStream2 = parse.tokenStream(stream2);
        const value2 = parse.parseValue(tokenStream2);

        assert.ok(value2.length === 3);
        assert.deepStrictEqual(
            value2.valueOf(), [
                "hello", [
                    "ola",
                    true
                ],
                "bonjour"
            ]
        );

        assert.ok(value2.get(1).line === 1);
        // Note the inner array starts on line 1 but it's first value is next line
        assert.ok(value2.get(1).get(0).line === 2);

        // How about some objects?
        const stream3 = parse.streamFunc(`{
   "a": "1",
   "b": "1"
}`);
        const tokenStream3 = parse.tokenStream(stream3);
        const value3 = parse.parseValue(tokenStream3);

        assert.deepStrictEqual(Object.keys(value3.valueOf()), ["a", "b"]);
        assert.ok(value3.line === 0);
        assert.ok(value3.column === 0);

        assert.ok(value3.get("a").valueOf() === "1");
        assert.ok(value3.get("a").line === 1);
        assert.ok(value3.get("a").column === 8);

        // More objects
        const stream4 = parse.streamFunc(`[
   "hello", {
      "french": "bonjour",
      "spanish": "ola"
   }
]`);
        const tokenStream4 = parse.tokenStream(stream4);
        const value4 = parse.parseValue(tokenStream4);

        assert.ok(value4.get(1).get("spanish") == "ola");
        assert.ok(value4.get(1).get("spanish").line === 3);
        assert.ok(value4.get(1).get("spanish").column === 17);

        // And more objects
        const stream5 = parse.streamFunc(`[
   "hello", {
      "french": { 
         "greeting": "bonjour",
         "adieu": "au revior"
      },
      "spanish": {
         "greeting": "ola",
         "adieu": "ciao"
      }
   }
]`);
        const tokenStream5 = parse.tokenStream(stream5);
        const value5 = parse.parseValue(tokenStream5);

        assert.ok(value5.get(1).get("spanish").get("greeting") == "ola");

        // console.log("value5", JSON.stringify(value5, null, 2));
        // console.log("value5 valueOf", JSON.stringify(value5.valueOf(), null, 2));
    },

    testErrors: function () {
        const source = `{
      "french" "hello"
}`;
        try {
            parse.parseSource(source);
        }
        catch (e) {
            assert.ok(e instanceof parse.KeyError);
            assert.ok(e.line === 1);
            assert.ok(e.column === 15);
        }

        const source2 = `{
      "french": "hello",
`;
        try {
            parse.parseSource(source2);
        }
        catch (e) {
            assert.ok(e instanceof parse.EOFError);
            assert.ok(e.line === 2);
            assert.ok(e.column === 0);
        }

        const source3 = `{
      true: "hello",
      "adieu": "goodbye"
}`;
        try {
            parse.parseSource(source3);
        }
        catch (e) {
            assert.ok(e instanceof parse.KeyTypeError);
            assert.ok(e.line === 1);
            assert.ok(e.column === 6);
        }

        const source4 = `{
      "greeting": "hello"
      "adieu": "goodbye"
}`;
        try {
            const result = parse.parseSource(source4);
            console.log("result", result);
        }
        catch (e) {
            assert.ok(e instanceof parse.UnexpectedTypeError);
            assert.ok(e.line === 2);
            assert.ok(e.column === 6);
        }

    }
}


// Run the tests

tests.testStream();
tests.testReadString();
tests.testReadToken();
tests.testParseValue();
tests.testErrors();

// End
