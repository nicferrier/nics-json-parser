// CommonJs version

const parser = require("./parser.js");

module.exports = parser.parseSource;
module.exports.EOFError = parser.EOFError;
module.exports.KeyError = parser.KeyError;
module.exports.KeyTypeError = parser.KeyTypeError;

// End
