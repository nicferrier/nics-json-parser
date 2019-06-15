// commonjs version

const parser = require("./parser");

module.exports = function (string) {
    const stream = parser.streamFunc(string);
    const tokenStream = parser.tokenStream(stream);
    const value = parser.parseValue(tokenStream);
    return value;
};

// End
