// The main parser... no depends!

const debug = false;

class EOFError extends Error {
    constructor(message, line, column, pos) {
        super(message);
        this.line = line;
        this.column = column;
        this.pos = pos;
    }
}

/* Make a stream abstraction around a string.

  The stream delivers strings that have position properties on them,
  so it makes the decision about what a line is.

  Currently lines are separated by '\n' but a state parser for '\r\n'
  would be easy.
 */
const streamFunc = function (string) {
    let i = 0;
    let line = 0;
    let column = 0;
    return {
        read: function () {
            if (i === string.length) {
                throw new EOFError("beyond the input", line, column, i);
            }
            const ch = string[i++];
            const s = new String(ch);
            s.line = ch === "\n" ? line++ : line;
            s.column = column;
            column = ch === "\n" ? 0 : column + 1;
            s.pos = i;
            return s;
        },

        peek: function () {
            if (i == string.length) return -1;
            return string[i];
        },

        unread: function (character) {
            // not implemented yet
            // but should splice charatcer into input
            // if character is a string with properties just take the ch
        }
    };
};

const readString = function (initCh, stream) {
    const end = initCh.valueOf();
    let targetStr = "";
    let escape = false;
    collect_loop: while (true) {
        let ch = stream.read();
        switch (ch.valueOf()) {
        case "\\":
            escape = true;
            targetStr = targetStr + ch;
            break collect_loop;
        case end:
            if (escape) {
                targetStr = targetStr + ch;
                escape = false;
                continue collect_loop;
            }
            break collect_loop;
        default:
            if (escape) {
                escape = false;
            }
            targetStr = targetStr + ch;
            continue collect_loop;
        }
    }
    const value = new String(targetStr);
    value.line = initCh.line;
    value.column = initCh.column;
    return value;
};

class Token {
    constructor(character, type) {
        this.char = character.valueOf();
        this.character = character;
        this.type = type;
    }
}

class EOFToken extends Token {
    constructor() {
        super(-1, "eof");
    }
}

class Identifier extends Token {
    constructor(str) {
        super(str, "identifier");
        this.str = str;
        this.line = str.line;
        this.column = str.column;
    }

    valueOf() {
        return this.str.valueOf();
    }
}

const braceOpen = new Token("{", "braceOpen");
const braceClose = new Token("}", "braceClose");
const bracketOpen = new Token("[", "bracketOpen");
const bracketClose = new Token("]", "bracketClose");
const comma = new Token(",", "comma");
const colon = new Token(":", "colon");
const endOfFile = new EOFToken();

const tokenStream = function* (stream) {
    if (stream === undefined) {
        return endOfFile;
    }

    const tokenMap = [ // Makes an object with the token char as the key to the token
        braceOpen,
        braceClose,
        bracketOpen,
        bracketClose,
        comma,
        colon
    ].reduce((o,token) => {
        o[token.char] = token;
        return o;
    }, {});

    try {
        let tokenBuffer = "";
        readLoop: while (true) {
            let ch = stream.read();

            if (ch == '"' || ch == "'") {
                if (tokenBuffer.length > 0) {
                    yield new Identifier(tokenBuffer);
                    tokenBuffer = "";
                }

                const strToken = readString(ch, stream);
                strToken.type = "string";
                yield strToken;
                continue;
            }

            switch (ch.valueOf()) {
            case ' ':
            case '\t':
            case '\n':
            case '\r':
                if (tokenBuffer.length > 0) {
                    yield new Identifier(tokenBuffer);
                    tokenBuffer = "";
                }
                continue readLoop;

            case "a": case "b": case "c": case "d": case "e":
            case "f": case "g": case "h": case "i": case "j":
            case "k": case "l": case "m": case "n": case "o":
            case "p": case "q": case "r": case "s": case "t":
            case "u": case "v": case "w": case "x": case "y":
            case "z": case "A": case "B": case "C": case "D":
            case "E": case "F": case "G": case "H": case "I":
            case "J": case "K": case "L": case "M": case "N":
            case "O": case "P": case "Q": case "R": case "S":
            case "T": case "U": case "V": case "W": case "X":
            case "Y": case "Z":
                const started = tokenBuffer.length === 0;
                const prevBuf = tokenBuffer;
                tokenBuffer = new String(prevBuf + ch);
                tokenBuffer.line = started ? ch.line : prevBuf.line;
                tokenBuffer.column = started ? ch.column : prevBuf.column;
                continue readLoop;

            case braceOpen.char:
            case braceClose.char:
            case bracketOpen.char:
            case bracketClose.char:
            case comma.char:
            case colon.char:
                if (tokenBuffer.length > 0) {
                    yield new Identifier(tokenBuffer);
                    tokenBuffer = "";
                }
                const token = tokenMap[ch.valueOf()];
                token.line = ch.line;
                token.column = ch.column;
                yield token;
                break;
            }
        }
    }
    catch (e) {
        if (e instanceof EOFError) {
            //return endOfFile;
            throw e;
        }
    }
};


class ArrayValue {
    constructor(line, column) {
        this.type = "array";
        this.elements = [];
        this.line = line;
        this.column = column;
    }

    get length() {
        return this.elements.length;
    }

    push(e) {
        this.elements.push(e);
    }

    get(i) {
        return this.elements[i];
    }

    valueOf() {
        const value = this.elements.map(v => v.valueOf());
        return value;
    }
}

class ObjectValue {
    constructor(line, column) {
        this.type = "object";
        this.elements = {};
        this.line = line;
        this.column = column;
    }

    get(key) {
        return this.elements[key];
    }

    set(key, value) {
        this.elements[key] = value;
    }

    valueOf() {
        const value = Object.keys(this.elements).reduce((o,k) => {
            o[k] = this.get(k).valueOf();
            return o;
        }, {});
        return value;
    }
}

class KeyError extends Error {
    constructor(message, token) {
        super(message);
        this.token = token;
        this.line = token.line;
        this.column = token.column;
    }
}

class KeyTypeError extends Error {
    constructor(message, token) {
        super(message);
        this.token = token;
        this.line = token.line;
        this.column = token.column;
    }
}

class UnexpectedTypeError extends Error {
    constructor(message, token) {
        super(message);
        this.token = token;
        this.line = token.line;
        this.column = token.column;
    }
}

const parseValueList = function (tokenStream, line, column) {
    const list = new ArrayValue(line, column);

    while (true) {
        let value = parseValue(tokenStream);

        if (debug) {
            console.log("parseValueList value", value);
        }

        if (["object", "array",
             "string", "boolean", "identfier"].indexOf(value.type) > -1) {
            list.push(value);

            const nextToken = tokenStream.next().value;
            if (nextToken.type === "comma") {
                continue;
            }

            return [nextToken, list];
        }
        return [value, list];
    }
};

const parseArray = function (tokenStream, line, column) {
    const [terminalToken, list] = parseValueList(tokenStream, line, column);
    if (terminalToken.type === "bracketClose") {
        return list;
    }
};

const parsePairList = function (tokenStream, line, column) {
    const obj = new ObjectValue(line, column);
    let key = tokenStream.next().value;
    if (key.type === "braceClose") {
        return [key, obj];
    }
    while (true) {
        if (key.type !== "string") {
            throw new KeyTypeError("expecting a string key", key);
        }

        const expectedColon = tokenStream.next().value;
        if (expectedColon.type !== "colon") {
            throw new KeyError("expecting a colon", expectedColon);
        }

        const value = parseValue(tokenStream);
        obj.set(key, value);

        const nextToken = tokenStream.next().value;
        if (nextToken.type === "comma") {
            // Read the next expected key
            key = tokenStream.next().value;
            continue;
        }

        return [nextToken, obj];
    }
};

const parseObject = function (tokenStream, line, column) {
    const [terminalToken, obj] = parsePairList(tokenStream, line, column);
    if (terminalToken.type === "braceClose") {
        return obj;
    }

    throw new UnexpectedTypeError(
        `unexpected type ${terminalToken.valueOf()} at ${terminalToken.line}:${terminalToken.column}`,
        terminalToken
    );
};

const parseValue = function (tokenStream) {
    let token = tokenStream.next().value;

    if (token.type === "bracketOpen") {
        const array = parseArray(tokenStream, token.line, token.column);
        return array;
    }

    if (token.type === "braceOpen") {
        const object = parseObject(tokenStream, token.line, token.column);
        return object;
    }
    
    if (token.type === "identifier"
        && (token.valueOf() === "true"
            || token.valueOf() === "false")) {
        const bool = new Boolean(token.valueOf());
        bool.type = "boolean";
        bool.line = token.line;
        bool.column = token.column;
        return bool;
    }

    if (token.type === "string" || token.type === "array") {
        return token;
    }

    if (debug) {
        console.log("parseValue unknown type", token);
    }
};

const parseSource = function (source) {
    const stream = streamFunc(source);
    const tokStream = tokenStream(stream);
    const value = parseValue(tokStream);
    return value;
};

// Attach these to parseSource so they get through to the ES6
parseSource.EOFError = EOFError;
parseSource.KeyError = KeyError;
parseSource.KeyTypeError = KeyTypeError;
parseSource.UnexpectedTypeError = UnexpectedTypeError;

exports.streamFunc = streamFunc;
exports.readString = readString;
exports.parseArray = parseArray;
exports.tokenStream = tokenStream;
exports.parseValue = parseValue;
exports.parseSource = parseSource;

// Some errors
exports.EOFError = EOFError;
exports.KeyError = KeyError;
exports.KeyTypeError = KeyTypeError;
exports.UnexpectedTypeError = UnexpectedTypeError;

// End
