
var Node = require('./node');

var Code = module.exports = function Code(val, buffer, escape) {
    Node.call(this);
    this.val = val;
    this.buffer = buffer;
    this.escape = escape;
};

Code.prototype.__proto__ = Node.prototype;