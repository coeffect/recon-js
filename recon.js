'use strict';


function coerce(value) {
  if (value === null) return Extant;
  else if (value instanceof Record ||
           typeof value === 'string' ||
           typeof value === 'number' ||
           value instanceof Uint8Array) return value;
  else if (typeof value === 'boolean') return value.toString();
  else if (Array.isArray(value)) return coerceArray(value);
  else if (typeof value === 'object') {
    if (value.toRecon && typeof value.toRecon === 'function') return value.toRecon();
    else return coerceObject(value);
  }
  else return Absent;
}
function coerceArray(array) {
  var builder = new RecordBuilder();
  var n = array.length;
  var i = 0;
  while (i < n) {
    var value = coerce(array[i]);
    builder.appendValue(value);
    i += 1;
  }
  return builder.state();
}
function coerceObject(object) {
  var builder = new RecordBuilder();
  var prop, key, value;
  var attrs = object['@'];
  for (prop in attrs) {
    key = coerce(prop);
    if (typeof key === 'string') {
      value = coerce(attrs[prop]);
      if (!value.isAbsent) builder.appendField(new Attr(key, value));
    }
  }
  for (prop in object) {
    if (prop !== '@') {
      key = coerce(prop);
      if (!key.isAbsent) {
        value = coerce(object[prop]);
        if (!value.isAbsent) builder.appendField(new Slot(key, value));
      }
    }
  }
  return builder.state();
}

function parse(string) {
  var input = new StringIterator(string);
  var result = new DocumentParser().run(input);
  return result.state();
}

function stringify(value) {
  var writer = new ReconWriter();
  writer.writeBlock(value);
  return writer.state();
}

function objectify(value) {
  if (value === null || value.isExtant) return null;
  else if (value.isAbsent) return undefined;
  else if (value instanceof Record) {
    if (value.isArray()) return objectifyArray(value);
    else return objectifyObject(value);
  }
  else return value;
}
function objectifyArray(record) {
  var array = [];
  var items = record.iterator();
  while (!items.isEmpty()) {
    var value = objectify(items.head());
    array.push(value);
    items.step();
  }
  return array;
}
function objectifyObject(record) {
  var items = record.iterator();
  var key, value;
  var attrs = {};
  var object = {'@': attrs};
  var hasAttrs = false;
  var i = 0;
  while (!items.isEmpty()) {
    var item = items.head();
    if (item.isField) {
      key = objectify(item.key);
      value = objectify(item.value);
      if (item.isAttr) {
        attrs[key] = value;
        hasAttrs = true;
      }
      else object[key] = value;
    }
    else {
      value = objectify(item.value);
      object[i] = value;
    }
    items.step();
    i += 1;
  }
  if (!hasAttrs) delete object['@'];
  return object;
}


function Record(items, index) {
  var record = function(key) {
    var value = index[key];
    if (typeof value === 'undefined' && typeof key === 'number') value = items[key];
    return value;
  };
  record.__proto__ = Record.prototype;
  record.size = items.length;
  record.isArray = function () {
    return items.length >= 0 && Object.getOwnPropertyNames(index).length === 0;
  };
  record.iterator = function () {
    return new RecordIterator(items);
  };
  return record;
}
Record.prototype = Object.create(Function.prototype);
Record.prototype.constructor = Record;
Record.prototype.isEmpty = function () {
  return this.size === 0;
};
Record.prototype.isMarkup = function () {
  function isBlank(string) {
    var cs = new StringIterator(string);
    while (!cs.isEmpty() && isSpace(cs.head())) cs.step();
    return cs.isEmpty();
  }
  var items = this.iterator();
  var afterNonText = false;
  var hasNonText = false;
  var sections = 0;
  while (!items.isEmpty()) {
    var item = items.head();
    if (typeof item !== 'string') {
      if (afterNonText) return false;
      afterNonText = true;
      hasNonText = true;
    }
    else if (afterNonText && !isBlank(item)) {
      afterNonText = false;
      sections += 1;
    }
    else if (sections === 0) sections = 1;
    items.step();
  }
  return hasNonText && sections >= 2;
};
Record.prototype.toString = function () {
  var writer = new ReconWriter();
  writer.writeRecord(this);
  return writer.state();
};


function Field() {}
Field.prototype.isField = true;
Field.prototype.isAttr = false;
Field.prototype.isSlot = false;

function Attr(key, value) {
  Field.call(this);
  this.key = key;
  this.value = typeof value === 'undefined' ? Extant : value;
}
Attr.prototype = Object.create(Field.prototype);
Attr.prototype.constructor = Attr;
Attr.prototype.isAttr = true;

function Slot(key, value) {
  Field.call(this);
  this.key = key;
  this.value = typeof value === 'undefined' ? Extant : value;
}
Slot.prototype = Object.create(Field.prototype);
Slot.prototype.constructor = Slot;
Slot.prototype.isSlot = true;


var Extant = {
  isExtant: true
};

var Absent = {
  isAbsent: true
};


function RecordIterator(items, index) {
  this.items = items;
  this.index = index || 0;
}
RecordIterator.prototype.isEmpty = function () {
  return this.index >= this.items.length;
};
RecordIterator.prototype.head = function () {
  if (this.index >= this.items.length) throw 'head of empty iterator';
  return this.items[this.index];
};
RecordIterator.prototype.step = function () {
  if (this.index >= this.items.length) throw 'empty iterator step';
  this.index += 1;
};


function RecordBuilder() {
  this.items = [];
  this.index = {};
}
RecordBuilder.prototype.appendField = function (field) {
  this.items.push(field);
  this.index[field.key] = field.value;
};
RecordBuilder.prototype.appendValue = function (value) {
  this.items.push(value);
};
RecordBuilder.prototype.state = function () {
  return new Record(this.items, this.index);
};


function ValueBuilder() {
  this.items = null;
  this.index = null;
  this.value = null;
}
ValueBuilder.prototype.appendField = function (field) {
  if (!this.items) {
    this.items = [];
    this.index = {};
    if (this.value) {
      this.items.push(this.value);
      this.value = null;
    }
  }
  this.items.push(field);
  this.index[field.key] = field.value;
};
ValueBuilder.prototype.appendValue = function (value) {
  if (this.items) this.items.push(value);
  else if (!this.value) this.value = value;
  else {
    this.items = [];
    this.index = {};
    this.items.push(this.value);
    this.value = null;
    this.items.push(value);
  }
};
ValueBuilder.prototype.state = function () {
  if (this.value) return this.value;
  else if (this.items) return new Record(this.items, this.index);
  else return Absent;
};


function StringIterator(string, index) {
  this.string = string || '';
  this.index = index || 0;
}
StringIterator.prototype.isDone = function () {
  return false;
};
StringIterator.prototype.isEmpty = function () {
  return this.index >= this.string.length;
};
StringIterator.prototype.head = function () {
  var c1 = this.string.charCodeAt(this.index);
  if (c1 <= 0xD7FF || c1 >= 0xE000) return c1; // U+0000..U+D7FF | U+E000..U+FFFF
  else if (c1 <= 0xDBFF && this.index + 1 < this.string.length) { // c1 >= 0xD800
    var c2 = this.string.charCodeAt(this.index + 1);
    if (c2 >= 0xDC00 && c2 <= 0xDFFF) // U+10000..U+10FFFF
      return (((c1 & 0x3FF) << 10) | (c2 & 0x3FF)) + 0x10000;
    else return 0xFFFD;
  }
  else return 0xFFFD;
};
StringIterator.prototype.step = function () {
  var c1 = this.string.charCodeAt(this.index);
  if (c1 <= 0xD7FF || c1 >= 0xE000) // U+0000..U+D7FF | U+E000..U+FFFF
    this.index += 1;
  else if (c1 <= 0xDBFF && this.index + 1 < this.string.length) { // c1 >= 0xD800
    var c2 = this.string.charCodeAt(this.index + 1);
    if (c2 >= 0xDC00 && c2 <= 0xDFFF) // U+10000..U+10FFFF
      this.index += 2;
    else this.index += 1;
  }
  else this.index += 1;
};

StringIterator.Done = {
  isDone: function () {
    return true;
  },
  isEmpty: function () {
    return true;
  },
  head: function () {
    throw 'head of empty iterator';
  },
  step: function () {
    throw 'empty iterator step';
  }
};
StringIterator.Done.prototype = Object.create(StringIterator.prototype);


function StringIteratee() {}
StringIteratee.prototype.isCont = function () {
  return true;
};
StringIteratee.prototype.isDone = function () {
  return false;
};
StringIteratee.prototype.isError = function () {
  return false;
};
StringIteratee.prototype.feed = function (input) {
  return this;
};
StringIteratee.prototype.run = function (input) {
  var next = this;
  while (!input.isEmpty() && next.isCont()) next = next.feed(input);
  if (input.isEmpty() && !input.isDone() && next.isCont()) next = next.feed(StringIterator.Done);
  return next;
};

StringIteratee.Done = function (value) {
  StringIteratee.call(this);
  this.value = value;
};
StringIteratee.Done.prototype = Object.create(StringIteratee.prototype);
StringIteratee.Done.prototype.constructor = StringIteratee.Done;
StringIteratee.Done.prototype.isCont = function () {
  return false;
};
StringIteratee.Done.prototype.isDone = function () {
  return true;
};
StringIteratee.Done.prototype.feed = function (input) {
  return this;
};
StringIteratee.Done.prototype.state = function () {
  return this.value;
};

StringIteratee.Error = function (error) {
  StringIteratee.call(this);
  this.error = error;
};
StringIteratee.Error.prototype = Object.create(StringIteratee.prototype);
StringIteratee.Error.prototype.constructor = StringIteratee.Error;
StringIteratee.Error.prototype.isCont = function () {
  return false;
};
StringIteratee.Error.prototype.isError = function () {
  return true;
};
StringIteratee.Error.prototype.feed = function (input) {
  return this;
};
StringIteratee.Error.prototype.state = function () {
  throw this.error;
};

StringIteratee.unexpectedEOF = new StringIteratee.Error('unexpected end of input');


function StringBuilder() {
  this.string = '';
}
StringBuilder.prototype.append = function (c) {
  if ((c >= 0x0000 && c <= 0xD7FF) ||
      (c >= 0xE000 && c <= 0xFFFF)) { // U+0000..U+D7FF | U+E000..U+FFFF
    this.string += String.fromCharCode(c);
  }
  else if (c >= 0x10000 && c <= 0x10FFFF) { // U+10000..U+10FFFF
    var u = c - 0x10000;
    this.string += String.fromCharCode(0xD800 | (u >>> 10), 0xDC00 | (u & 0x3FF));
  }
  else { // invalid code point
    this.string += String.fromCharCode(0xFFFD);
  }
};
StringBuilder.prototype.appendString = function (s) {
  var cs = new StringIterator(s);
  while (!cs.isEmpty()) {
    this.append(cs.head());
    cs.step();
  }
};
StringBuilder.prototype.state = function () {
  return this.string;
};


function DataBuilder() {
  this.buffer = null;
  this.offset = 0;
  this.aliased = true;
  this.p = 0;
  this.q = 0;
  this.r = 0;
  this.s = 0;
}
DataBuilder.prototype.prepare = function (size) {
  function expand(base, size) {
    var n = Math.max(base, size) - 1;
    n |= n >> 1; n |= n >> 2; n |= n >> 4; n |= n >> 8;
    return n + 1;
  }
  if (this.aliased || size > this.buffer.length) {
    var array = new Uint8Array(expand(256, size));
    if (this.buffer) array.set(this.buffer);
    this.buffer = array;
    this.aliased = false;
  }
};
DataBuilder.prototype.appendByte = function (value) {
  this.prepare(this.offset + 1);
  this.buffer[this.offset] = value;
  this.offset += 1;
};
DataBuilder.prototype.decodeBase64Digit = function (c) {
  if (c >= 65/*'A'*/ && c <= 90/*'Z'*/) return c - 65/*'A'*/;
  else if (c >= 97/*'a'*/ && c <= 122/*'z'*/) return c - 71/*'a' - 26*/;
  else if (c >= 48/*'0'*/ && c <= 57/*'9'*/) return c + 4/*52 - '0'*/;
  else if (c === 43/*'+'*/ || c === 45/*'-'*/) return 62;
  else if (c === 47/*'/'*/ || c === 95/*'_'*/) return 63;
};
DataBuilder.prototype.decodeBase64Quantum = function () {
  var x = this.decodeBase64Digit(this.p);
  var y = this.decodeBase64Digit(this.q);
  if (this.r !== 61/*'='*/) {
    var z = this.decodeBase64Digit(this.r);
    if (this.s !== 61/*'='*/) {
      var w = this.decodeBase64Digit(this.s);
      this.appendByte((x << 2) | (y >>> 4));
      this.appendByte((y << 4) | (z >>> 2));
      this.appendByte((z << 6) | w);
    }
    else {
      this.appendByte((x << 2) | (y >>> 4));
      this.appendByte((y << 4) | (z >>> 2));
    }
  }
  else {
    if (this.s !== 61/*'='*/) throw 'incomplete base64 quantum';
    this.appendByte((x << 2) | (y >>> 4));
  }
};
DataBuilder.prototype.appendBase64Char = function (c) {
  if (this.p === 0) this.p = c;
  else if (this.q === 0) this.q = c;
  else if (this.r === 0) this.r = c;
  else {
    this.s = c;
    this.decodeBase64Quantum();
    this.s = 0;
    this.r = 0;
    this.q = 0;
    this.p = 0;
  }
};
DataBuilder.prototype.state = function (value) {
  if (!this.buffer) this.buffer = new Uint8Array(0);
  else if (this.buffer.length !== this.offset) {
    var array = new Uint8Array(this.offset);
    array.set(this.buffer.subarray(0, this.offset));
    this.buffer = array;
  }
  this.aliased = true;
  return this.buffer;
};


function isSpace(c) {
  return c === 0x20 || c === 0x9;
}
function isNewline(c) {
  return c === 0xA || c === 0xD;
}
function isWhitespace(c) {
  return isSpace(c) || isNewline(c);
}
function isNameStartChar(c) {
  return (
    c >= 65/*'A'*/ && c <= 90/*'Z'*/ ||
    c === 95/*'_'*/ ||
    c >= 97/*'a'*/ && c <= 122/*'z'*/ ||
    c >= 0xC0 && c <= 0xD6 ||
    c >= 0xD8 && c <= 0xF6 ||
    c >= 0xF8 && c <= 0x2FF ||
    c >= 0x370 && c <= 0x37D ||
    c >= 0x37F && c <= 0x1FFF ||
    c >= 0x200C && c <= 0x200D ||
    c >= 0x2070 && c <= 0x218F ||
    c >= 0x2C00 && c <= 0x2FEF ||
    c >= 0x3001 && c <= 0xD7FF ||
    c >= 0xF900 && c <= 0xFDCF ||
    c >= 0xFDF0 && c <= 0xFFFD ||
    c >= 0x10000 && c <= 0xEFFFF);
}
function isNameChar(c) {
  return (
    c === 45/*'-'*/ ||
    c >= 48/*'0'*/ && c <= 57/*'9'*/ ||
    c >= 65/*'A'*/ && c <= 90/*'Z'*/ ||
    c === 95/*'_'*/ ||
    c >= 97/*'a'*/ && c <= 122/*'z'*/ ||
    c === 0xB7 ||
    c >= 0xC0 && c <= 0xD6 ||
    c >= 0xD8 && c <= 0xF6 ||
    c >= 0xF8 && c <= 0x37D ||
    c >= 0x37F && c <= 0x1FFF ||
    c >= 0x200C && c <= 0x200D ||
    c >= 0x203F && c <= 0x2040 ||
    c >= 0x2070 && c <= 0x218F ||
    c >= 0x2C00 && c <= 0x2FEF ||
    c >= 0x3001 && c <= 0xD7FF ||
    c >= 0xF900 && c <= 0xFDCF ||
    c >= 0xFDF0 && c <= 0xFFFD ||
    c >= 0x10000 && c <= 0xEFFFF);
}
function isBase64Char(c) {
  return (
    c >= 48/*'0'*/ && c <= 57/*'9'*/ ||
    c >= 65/*'A'*/ && c <= 90/*'Z'*/ ||
    c >= 97/*'a'*/ && c <= 122/*'z'*/ ||
    c === 43/*'+'*/ || c === 45/*'-'*/ ||
    c === 47/*'/'*/ || c === 95/*'_'*/);
}


function DocumentParser(value) {
  StringIteratee.call(this);
  this.value = value || new BlockParser();
}
DocumentParser.prototype = Object.create(StringIteratee.prototype);
DocumentParser.prototype.constructor = DocumentParser;
DocumentParser.prototype.feed = function (input) {
  var value = this.value;
  while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
  if (value.isError()) return value;
  if (value.isDone()) {
    if (!input.isEmpty()) return new StringIteratee.Error({found: input.head()});
    else if (input.isDone()) return value;
  }
  return new DocumentParser(value);
};


function BlockParser(builder, key, value, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.key = key || null;
  this.value = value || null;
  this.s = s || 1;
}
BlockParser.prototype = Object.create(StringIteratee.prototype);
BlockParser.prototype.constructor = BlockParser;
BlockParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var key = this.key;
  var builder = this.builder || new ValueBuilder();
  while (!input.isEmpty() || input.isDone()) {
    if (s === 1) {
      while (!input.isEmpty() && (c = input.head(), isWhitespace(c))) input.step();
      if (!input.isEmpty()) s = 2;
      else if (input.isDone()) return new StringIteratee.Done(builder.state());
    }
    if (s === 2) {
      key = key || new BlockValueParser();
      while ((!input.isEmpty() || input.isDone()) && key.isCont()) key = key.feed(input);
      if (key.isDone()) s = 3;
      else if (key.isError()) return key;
    }
    if (s === 3) {
      while (!input.isEmpty() && (c = input.head(), isSpace(c))) input.step();
      if (!input.isEmpty()) {
        if (c === 58/*':'*/) {
          input.step();
          s = 4;
        }
        else {
          builder.appendValue(key.state());
          key = null;
          s = 6;
        }
      }
      else if (input.isDone()) {
        builder.appendValue(key.state());
        return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 4) {
      while (!input.isEmpty() && isSpace(input.head())) input.step();
      if (!input.isEmpty()) s = 5;
      else if (input.isDone()) {
        builder.appendField(new Slot(key.state()));
        return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 5) {
      value = value || new BlockValueParser();
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        builder.appendField(new Slot(key.state(), value.state()));
        key = null;
        value = null;
        s = 6;
      }
      else if (value.isError()) return value;
    }
    if (s === 6) {
      while (!input.isEmpty() && (c = input.head(), isSpace(c))) input.step();
      if (!input.isEmpty()) {
        if (c === 44/*','*/ || c === 59/*';'*/ || isNewline(c)) {
          input.step();
          s = 1;
        }
        else return new StringIteratee.Done(builder.state());
      }
      else if (input.isDone()) return new StringIteratee.Done(builder.state());
    }
  }
  return new BlockParser(builder, key, value, s);
};


function AttrParser(ident, value, s) {
  StringIteratee.call(this);
  this.ident = ident || new IdentParser();
  this.value = value || new BlockParser();
  this.s = s || 1;
}
AttrParser.prototype = Object.create(StringIteratee.prototype);
AttrParser.prototype.constructor = AttrParser;
AttrParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var ident = this.ident;
  if (s === 1) {
    if (!input.isEmpty() && (c = input.head(), c === 64/*'@'*/)) {
      input.step();
      s = 2;
    }
    else if (!input.isEmpty()) return new StringIteratee.Error({expected: '\'@\'', found: c});
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 2) {
    ident = ident.feed(input);
    if (ident.isDone()) s = 3;
    else if (ident.isError()) return ident;
  }
  if (s === 3) {
    if (!input.isEmpty() && input.head() === 40/*'('*/) {
      input.step();
      s = 4;
    }
    else if (!input.isEmpty() || input.isDone()) return new StringIteratee.Done(new Attr(ident.state()));
  }
  if (s === 4) {
    while (!input.isEmpty() && (c = input.head(), isWhitespace(c))) input.step();
    if (!input.isEmpty()) {
      if (c === 41/*')'*/) {
        input.step();
        return new StringIteratee.Done(new Attr(ident.state()));
      }
      else s = 5;
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 5) {
    while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
    if (value.isDone()) s = 6;
    else if (value.isError()) return value;
  }
  if (s === 6) {
    while (!input.isEmpty() && (c = input.head(), isWhitespace(c))) input.step();
    if (!input.isEmpty()) {
      if (c === 41/*')'*/) {
        input.step();
        return new StringIteratee.Done(new Attr(ident.state(), value.state()));
      }
      else return new StringIteratee.Error({expected: '\')\'', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  return new AttrParser(ident, value, s);
};


function BlockValueParser(builder, field, value, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.field = field || null;
  this.value = value || null;
  this.s = s || 1;
}
BlockValueParser.prototype = Object.create(StringIteratee.prototype);
BlockValueParser.prototype.constructor = BlockValueParser;
BlockValueParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var field = this.field;
  var builder = this.builder;
  while (!input.isEmpty() || input.isDone()) {
    if (s === 1) {
      if (!input.isEmpty()) {
        c = input.head();
        if (c === 64/*'@'*/) {
          field = new AttrParser();
          s = 2;
        }
        else if (c === 123/*'{'*/) {
          if (builder) {
            value = new RecordParser(builder);
            s = 5;
          }
          else {
            value = new RecordParser();
            s = 4;
          }
        }
        else if (c === 91/*'['*/) {
          if (builder) {
            value = new MarkupParser(builder);
            s = 5;
          }
          else {
            value = new MarkupParser();
            s = 4;
          }
        }
        else if (c === 34/*'"'*/) {
          value = new StringParser();
          s = 4;
        }
        else if (c === 37/*'%'*/) {
          value = new DataParser();
          s = 4;
        }
        else if (c === 45/*'-'*/ || c >= 48/*'0'*/ && c <= 57/*'9'*/) {
          value = new NumberParser();
          s = 4;
        }
        else if (isNameStartChar(c)) {
          value = new IdentParser();
          s = 4;
        }
        else if (!builder) return new StringIteratee.Done(Absent);
        else return new StringIteratee.Done(builder.state());
      }
      else if (input.isDone()) {
        if (!builder) return new StringIteratee.Done(Absent);
        else return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 2) {
      while ((!input.isEmpty() || input.isDone()) && field.isCont()) field = field.feed(input);
      if (field.isDone()) {
        builder = builder || new ValueBuilder();
        builder.appendField(field.state());
        field = null;
        s = 3;
      }
      else if (field.isError()) return field;
    }
    if (s === 3) {
      while (!input.isEmpty() && isSpace(input.head())) input.step();
      if (!input.isEmpty()) s = 1;
      else if (input.isDone()) return new StringIteratee.Done(builder.state());
    }
    if (s === 4) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        builder = builder || new ValueBuilder();
        builder.appendValue(value.state());
        return new StringIteratee.Done(builder.state());
      }
      else if (value.isError()) return value;
    }
    if (s === 5) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) return new StringIteratee.Done(builder.state());
      else if (value.isError()) return value;
    }
  }
  return new BlockValueParser(builder, field, value, s);
};


function InlineValueParser(builder, field, value, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.field = field || null;
  this.value = value || null;
  this.s = s || 1;
}
InlineValueParser.prototype = Object.create(StringIteratee.prototype);
InlineValueParser.prototype.constructor = InlineValueParser;
InlineValueParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var field = this.field;
  var builder = this.builder;
  while (!input.isEmpty() || input.isDone()) {
    if (s === 1) {
      if (!input.isEmpty()) {
        c = input.head();
        if (c === 64/*'@'*/) {
          field = new AttrParser();
          s = 2;
        }
        else if (c === 123/*'{'*/) {
          if (builder) {
            value = new RecordParser(builder);
            s = 5;
          }
          else {
            value = new RecordParser();
            s = 4;
          }
        }
        else if (c === 91/*'['*/) {
          if (builder) {
            value = new MarkupParser(builder);
            s = 5;
          }
          else {
            value = new MarkupParser();
            s = 4;
          }
        }
        else if (!builder) return new StringIteratee.Done(Absent);
        else return new StringIteratee.Done(builder.state());
      }
      else if (input.isDone()) {
        if (!builder) return new StringIteratee.Done(Absent);
        else return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 2) {
      while ((!input.isEmpty() || input.isDone()) && field.isCont()) field = field.feed(input);
      if (field.isDone()) {
        builder = builder || new ValueBuilder();
        builder.appendField(field.state());
        field = null;
        s = 3;
      }
      else if (field.isError()) return field;
    }
    if (s === 3) {
      while (!input.isEmpty() && isSpace(input.head())) input.step();
      if (!input.isEmpty()) s = 1;
      else if (input.isDone()) return new StringIteratee.Done(builder.state());
    }
    if (s === 4) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        builder = builder || new ValueBuilder();
        builder.appendValue(value.state());
        return new StringIteratee.Done(builder.state());
      }
      else if (value.isError()) return value;
    }
    if (s === 5) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) return new StringIteratee.Done(builder.state());
      else if (value.isError()) return value;
    }
  }
  return new InlineValueParser(builder, field, value, s);
};


function RecordParser(builder, key, value, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.key = key || null;
  this.value = value || null;
  this.s = s || 1;
}
RecordParser.prototype = Object.create(StringIteratee.prototype);
RecordParser.prototype.constructor = RecordParser;
RecordParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var key = this.key;
  var builder = this.builder || new RecordBuilder();
  if (s === 1) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 123/*'{'*/) {
        input.step();
        s = 2;
      }
      else return new StringIteratee.Error({expected: '\'{\'', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  while (!input.isEmpty() || input.isDone()) {
    if (s === 2) {
      while (!input.isEmpty() && (c = input.head(), isWhitespace(c))) input.step();
      if (!input.isEmpty()) {
        if (c === 125/*'}'*/) {
          input.step();
          return new StringIteratee.Done(builder.state());
        }
        else s = 3;
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    if (s === 3) {
      key = key || new BlockValueParser();
      while ((!input.isEmpty() || input.isDone()) && key.isCont()) key = key.feed(input);
      if (key.isDone()) s = 4;
      else if (key.isError()) return key;
    }
    if (s === 4) {
      while (!input.isEmpty() && (c = input.head(), isSpace(c))) input.step();
      if (!input.isEmpty()) {
        if (c === 58/*':'*/) {
          input.step();
          s = 5;
        }
        else {
          builder.appendValue(key.state());
          key = null;
          s = 7;
        }
      }
      else if (input.isDone()) {
        builder.appendValue(key.state());
        return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 5) {
      while (!input.isEmpty() && isSpace(input.head())) input.step();
      if (!input.isEmpty()) s = 6;
      else if (input.isDone()) {
        builder.appendField(new Slot(key.state()));
        return new StringIteratee.Done(builder.state());
      }
    }
    if (s === 6) {
      value = value || new BlockValueParser();
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        builder.appendField(new Slot(key.state(), value.state()));
        key = null;
        value = null;
        s = 7;
      }
      else if (value.isError()) return value;
    }
    if (s === 7) {
      while (!input.isEmpty() && (c = input.head(), isSpace(c))) input.step();
      if (!input.isEmpty()) {
        if (c === 44/*','*/ || c === 59/*';'*/ || isNewline(c)) {
          input.step();
          s = 2;
        }
        else if (c === 125/*'}'*/) {
          input.step();
          return new StringIteratee.Done(builder.state());
        }
       else return new StringIteratee.Error({expected: '\'}\', \';\', \',\', or newline', found: c});
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
  }
  return new RecordParser(builder, key, value, s);
};


function MarkupParser(builder, text, value, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.text = text || null;
  this.value = value || null;
  this.s = s || 1;
}
MarkupParser.prototype = Object.create(StringIteratee.prototype);
MarkupParser.prototype.constructor = MarkupParser;
MarkupParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var value = this.value;
  var text = this.text;
  var builder = this.builder;
  if (s === 1) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 91/*'['*/) {
        input.step();
        s = 2;
      }
      else return new StringIteratee.Error({expected: '\'[\'', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  while (!input.isEmpty() || input.isDone()) {
    if (s === 2) {
      while (!input.isEmpty() && (c = input.head(),
          c !== 64/*'@'*/ &&
          c !== 91/*'['*/ &&
          c !== 92/*'\\'*/ &&
          c !== 93/*']'*/ &&
          c !== 123/*'{'*/ &&
          c !== 125/*'}'*/)) {
        input.step();
        text = text || new StringBuilder();
        text.append(c);
      }
      if (!input.isEmpty()) {
        if (c === 93/*']'*/) {
          input.step();
          if (!builder) {
            if (!text) text = text || new StringBuilder();
            return new StringIteratee.Done(text.state());
          }
          else {
            if (text) builder.appendValue(text.state());
            return new StringIteratee.Done(builder.state());
          }
        }
        else if (c === 64/*'@'*/) {
          builder = builder || new RecordBuilder();
          if (text) {
            builder.appendValue(text.state());
            text = null;
          }
          value = new InlineValueParser();
          s = 3;
        }
        else if (c === 123/*'{'*/) {
          builder = builder || new RecordBuilder();
          if (text) {
            builder.appendValue(text.state());
            text = null;
          }
          value = new RecordParser(builder);
          s = 4;
        }
        else if (c === 91/*'['*/) {
          builder = builder || new RecordBuilder();
          if (text) {
            builder.appendValue(text.state());
            text = null;
          }
          value = new MarkupParser(builder);
          s = 4;
        }
        else if (c === 92/*'\\'*/) {
          input.step();
          s = 5;
        }
        else new StringIteratee.Error({found: c});
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    if (s === 3) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        builder.appendValue(value.state());
        value = null;
        s = 2;
      }
      else if (value.isError()) return value;
    }
    if (s === 4) {
      while ((!input.isEmpty() || input.isDone()) && value.isCont()) value = value.feed(input);
      if (value.isDone()) {
        value = null;
        s = 2;
      }
      else if (value.isError()) return value;
    }
    if (s === 5) {
      if (!input.isEmpty()) {
        c = input.head();
        text = text || new StringBuilder();
        if (c === 34/*'"'*/ ||
            c === 47/*'/'*/ ||
            c === 64/*'@'*/ ||
            c === 91/*'['*/ ||
            c === 92/*'\\'*/ ||
            c === 93/*']'*/ ||
            c === 123/*'{'*/ ||
            c === 125/*'}'*/) {
          input.step();
          text.append(c);
          s = 2;
        }
        else if (c === 98/*'b'*/) {
          input.step();
          text.append(8/*'\b'*/);
          s = 2;
        }
        else if (c === 102/*'f'*/) {
          input.step();
          text.append(12/*'\f'*/);
          s = 2;
        }
        else if (c === 110/*'n'*/) {
          input.step();
          text.append(10/*'\n'*/);
          s = 2;
        }
        else if (c === 114/*'r'*/) {
          input.step();
          text.append(13/*'\r'*/);
          s = 2;
        }
        else if (c === 116/*'t'*/) {
          input.step();
          text.append(9/*'\t'*/);
          s = 2;
        }
        else return new StringIteratee.Error({expected: 'escape character', found: c});
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
  }
  return new MarkupParser(builder, text, value, s);
};


function StringParser(text, s) {
  StringIteratee.call(this);
  this.text = text || null;
  this.s = s || 1;
}
StringParser.prototype = Object.create(StringIteratee.prototype);
StringParser.prototype.constructor = StringParser;
StringParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var text = this.text;
  if (s === 1) {
    if (!input.isEmpty() && (c = input.head(), c === 34/*'"'*/)) {
      input.step();
      s = 2;
    }
    else if (!input.isEmpty()) return new StringIteratee.Error({expected: '\'"\'', found: c});
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  while (!input.isEmpty() || input.isDone()) {
    if (s === 2) {
      text = text || new StringBuilder();
      while (!input.isEmpty() && (c = input.head(), c !== 34/*'"'*/ && c !== 92/*'\\'*/)) {
        input.step();
        text.append(c);
      }
      if (!input.isEmpty()) {
        if (c === 34/*'"'*/) {
          input.step();
          return new StringIteratee.Done(text.state());
        }
        else if (c === 92/*'\\'*/) {
          input.step();
          s = 3;
        }
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    if (s === 3) {
      if (!input.isEmpty()) {
        c = input.head();
        if (c === 34/*'"'*/ ||
            c === 47/*'/'*/ ||
            c === 64/*'@'*/ ||
            c === 91/*'['*/ ||
            c === 92/*'\\'*/ ||
            c === 93/*']'*/ ||
            c === 123/*'{'*/ ||
            c === 125/*'}'*/) {
          input.step();
          text.append(c);
          s = 2;
        }
        else if (c === 98/*'b'*/) {
          input.step();
          text.append(8/*'\b'*/);
          s = 2;
        }
        else if (c === 102/*'f'*/) {
          input.step();
          text.append(12/*'\f'*/);
          s = 2;
        }
        else if (c === 110/*'n'*/) {
          input.step();
          text.append(10/*'\n'*/);
          s = 2;
        }
        else if (c === 114/*'r'*/) {
          input.step();
          text.append(13/*'\r'*/);
          s = 2;
        }
        else if (c === 116/*'t'*/) {
          input.step();
          text.append(9/*'\t'*/);
          s = 2;
        }
        else return new StringIteratee.Error({expected: 'escape character', found: c});
      }
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
  }
  return new StringParser(text, s);
};


function DataParser(data, s) {
  StringIteratee.call(this);
  this.data = data || null;
  this.s = s || 1;
}
DataParser.prototype = Object.create(StringIteratee.prototype);
DataParser.prototype.constructor = DataParser;
DataParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var data = this.data || new DataBuilder();
  if (s === 1) {
    if (!input.isEmpty() && (c = input.head(), c === 37/*'%'*/)) {
      input.step();
      s = 2;
    }
    else if (!input.isEmpty()) return new StringIteratee.Error({expected: '\'%\'', found: c});
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  while (!input.isEmpty() || input.isDone()) {
    if (s === 2) {
      if (!input.isEmpty() && (c = input.head(), isBase64Char(c))) {
        input.step();
        data.appendBase64Char(c);
        s = 3;
      }
      else if (!input.isEmpty() || input.isDone()) return new StringIteratee.Done(data.state());
    }
    if (s === 3) {
      if (!input.isEmpty() && (c = input.head(), isBase64Char(c))) {
        input.step();
        data.appendBase64Char(c);
        s = 4;
      }
      else if (!input.isEmpty()) return new StringIteratee.Error({expected: 'base64 digit', found: c});
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    if (s === 4) {
      if (!input.isEmpty() && (c = input.head(), isBase64Char(c) || c === 61/*'='*/)) {
        input.step();
        data.appendBase64Char(c);
        if (c !== 61/*'='*/) s = 5;
        else s = 6;
      }
      else if (!input.isEmpty()) return new StringIteratee.Error({expected: 'base64 digit', found: c});
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    if (s === 5) {
      if (!input.isEmpty() && (c = input.head(), isBase64Char(c) || c === 61/*'='*/)) {
        input.step();
        data.appendBase64Char(c);
        if (c !== 61/*'='*/) s = 2;
        else return new StringIteratee.Done(data.state());
      }
      else if (!input.isEmpty()) return new StringIteratee.Error({expected: 'base64 digit', found: c});
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
    else if (s === 6) {
      if (!input.isEmpty() && (c = input.head(), c === 61/*'='*/)) {
        input.step();
        data.appendBase64Char(c);
        return new StringIteratee.Done(data.state());
      }
      else if (!input.isEmpty()) return new StringIteratee.Error({expected: '\'=\'', found: c});
      else if (input.isDone()) return StringIteratee.unexpectedEOF;
    }
  }
  return new DataParser(data, s);
};


function NumberParser(builder, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.s = s || 1;
}
NumberParser.prototype = Object.create(StringIteratee.prototype);
NumberParser.prototype.constructor = NumberParser;
NumberParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var builder = this.builder || new StringBuilder();
  if (s === 1) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 45/*'-'*/) {
        input.step();
        builder.append(c);
      }
      s = 2;
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 2) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 48/*'0'*/) {
        input.step();
        builder.append(c);
        s = 4;
      }
      else if (c >= 49/*'1'*/ && c <= 57/*'9'*/) {
        input.step();
        builder.append(c);
        s = 3;
      }
      else return new StringIteratee.Error({expected: 'digit', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 3) {
    while (!input.isEmpty() && (c = input.head(), c >= 48/*'0'*/ && c <= 57/*'9'*/)) {
      input.step();
      builder.append(c);
    }
    if (!input.isEmpty()) s = 4;
    else if (input.isDone()) return new StringIteratee.Done(Number(builder.state()));
  }
  if (s === 4) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 46/*'.'*/) {
        input.step();
        builder.append(c);
        s = 5;
      }
      else if (c === 69/*'E'*/ || c === 101/*'e'*/) {
        input.step();
        builder.append(c);
        s = 8;
      }
      else return new StringIteratee.Done(Number(builder.state()));
    }
    else if (input.isDone()) return new StringIteratee.Done(Number(builder.state()));
  }
  if (s === 5) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c >= 48/*'0'*/ && c <= 57/*'9'*/) {
        input.step();
        builder.append(c);
        s = 6;
      }
      else return new StringIteratee.Error({expected: 'digit', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 6) {
    while (!input.isEmpty() && (c = input.head(), c >= 48/*'0'*/ && c <= 57/*'9'*/)) {
      input.step();
      builder.append(c);
    }
    if (!input.isEmpty()) s = 7;
    else if (input.isDone()) return new StringIteratee.Done(Number(builder.state()));
  }
  if (s === 7) {
    c = input.head();
    if (c === 69/*'E'*/ || c === 101/*'e'*/) {
      input.step();
      builder.append(c);
      s = 8;
    }
    else return new StringIteratee.Done(Number(builder.state()));
  }
  if (s === 8) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c === 43/*'+'*/ || c === 45/*'-'*/) {
        input.step();
        builder.append(c);
      }
      s = 9;
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 9) {
    if (!input.isEmpty()) {
      c = input.head();
      if (c >= 48/*'0'*/ && c <= 57/*'9'*/) {
        input.step();
        builder.append(c);
        s = 10;
      }
      else return new StringIteratee.Error({expected: 'digit', found: c});
    }
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 10) {
    while (!input.isEmpty() && (c = input.head(), c >= 48/*'0'*/ && c <= 57/*'9'*/)) {
      input.step();
      builder.append(c);
    }
    if (!input.isEmpty() || input.isDone()) return new StringIteratee.Done(Number(builder.state()));
  }
  return new NumberParser(builder, s);
};

function IdentParser(builder, s) {
  StringIteratee.call(this);
  this.builder = builder || null;
  this.s = s || 1;
}
IdentParser.prototype = Object.create(StringIteratee.prototype);
IdentParser.prototype.constructor = IdentParser;
IdentParser.prototype.feed = function (input) {
  var c = 0;
  var s = this.s;
  var builder = this.builder;
  if (s === 1) {
    if (!input.isEmpty() && (c = input.head(), isNameStartChar(c))) {
      builder = builder || new StringBuilder();
      input.step();
      builder.append(c);
      s = 2;
    }
    else if (!input.isEmpty()) return new StringIteratee.Error({expected: 'identitifer', found: c});
    else if (input.isDone()) return StringIteratee.unexpectedEOF;
  }
  if (s === 2) {
    while (!input.isEmpty() && (c = input.head(), isNameChar(c))) {
      input.step();
      builder.append(c);
    }
    if (!input.isEmpty() || input.isDone()) return new StringIteratee.Done(builder.state());
  }
  return new IdentParser(builder, s);
};


function ReconWriter(builder) {
  this.builder = builder || new StringBuilder();
}
ReconWriter.prototype.writeValue = function (value, inMarkup) {
  if (value instanceof Record) this.writeRecord(value, inMarkup);
  else if (typeof value === 'string') this.writeText(value, inMarkup);
  else if (typeof value === 'number') this.writeNumber(value);
  else if (value instanceof Uint8Array) this.writeData(value);
};
ReconWriter.prototype.writeAttr = function(attr) {
  this.builder.append(64/*'@'*/);
  this.writeIdent(attr.key);
  if (!attr.value.isExtant) {
    this.builder.append(40/*'('*/);
    this.writeBlock(attr.value);
    this.builder.append(41/*')'*/);
  }
};
ReconWriter.prototype.writeItem = function(item) {
  if (item.isField) {
    this.writeValue(item.key);
    this.builder.append(58/*':'*/);
    if (!item.value.isExtant) this.writeValue(item.value);
  }
  else this.writeValue(item);
};
ReconWriter.prototype.writeBlock = function (value) {
  if (!(value instanceof Record)) this.writeValue(value);
  else if (value.isMarkup()) this.writeMarkup(value);
  else {
    var items = value.iterator();
    var item;
    var hasAttrs = false;
    while (!items.isEmpty() && (item = items.head(), item.isAttr)) {
      this.writeAttr(item);
      items.step();
      hasAttrs = true;
    }
    if (!items.isEmpty()) {
      if (hasAttrs) this.builder.append(123/*'{'*/);
      this.writeItem(items.head());
      items.step();
      while (!items.isEmpty()) {
        this.builder.append(44/*','*/);
        this.writeItem(items.head());
        items.step();
      }
      if (hasAttrs) this.builder.append(125/*'}'*/);
    }
    else if (!hasAttrs) {
      this.builder.append(123/*'{'*/);
      this.builder.append(125/*'}'*/);
    }
  }
};
ReconWriter.prototype.writeRecord = function (record, inMarkup) {
  if (record.isMarkup()) this.writeMarkup(record);
  else {
    var items = record.iterator();
    var item;
    var hasAttrs = false;
    while (!items.isEmpty() && (item = items.head(), item.isAttr)) {
      this.writeAttr(item);
      items.step();
      hasAttrs = true;
    }
    if (!items.isEmpty()) {
      items.step();
      if (hasAttrs && items.isEmpty()) {
        if (inMarkup) {
          if (item instanceof Record || typeof item === 'string') this.writeValue(item, inMarkup);
          else {
            this.builder.append(123/*'{'*/);
            this.writeValue(item);
            this.builder.append(125/*'}'*/);
          }
        }
        else if (item.isSlot) {
          this.builder.append(123/*'{'*/);
          this.writeValue(item);
          this.builder.append(125/*'}'*/);
        }
        else if (typeof item === 'string') this.writeString(item);
        else this.writeValue(item);
      }
      else {
        this.builder.append(123/*'{'*/);
        this.writeItem(item);
        while (!items.isEmpty()) {
          item = items.head();
          this.builder.append(44/*','*/);
          this.writeItem(item);
          items.step();
        }
        this.builder.append(125/*'}'*/);
      }
    }
    else if (!hasAttrs) {
      this.builder.append(123/*'{'*/);
      this.builder.append(125/*'}'*/);
    }
  }
};
ReconWriter.prototype.writeMarkup = function (record) {
  var items = record.iterator();
  var item;
  var hasAttrs = false;
  while (!items.isEmpty() && (item = items.head(), item.isAttr)) {
    this.writeAttr(item);
    items.step();
    hasAttrs = true;
  }
  this.builder.append(91/*'['*/);
  while (!items.isEmpty()) {
    item = items.head();
    if (typeof item === 'string') {
      var cs = new StringIterator(item);
      while (!cs.isEmpty()) {
        var c = cs.head();
        switch (c) {
          case 64/*'@'*/:
          case 91/*'['*/:
          case 92/*'\\'*/:
          case 93/*']'*/:
          case 123/*'{'*/:
          case 125/*'}'*/: this.builder.append(92/*'\\'*/); this.builder.append(c); break;
          default: this.builder.append(c);
        }
        cs.step();
      }
    }
    else if (item instanceof Record) this.writeRecord(item, true);
    else {
      this.builder.append(123/*'{'*/);
      this.writeItem(item);
      this.builder.append(125/*'}'*/);
    }
    items.step();
  }
  this.builder.append(93/*']'*/);
};
ReconWriter.prototype.writeText = function (text, inMarkup) {
  function isIdent() {
    var cs = new StringIterator(text);
    if (cs.isEmpty() || !isNameStartChar(cs.head())) return false;
    cs.step();
    while (!cs.isEmpty() && isNameChar(cs.head())) cs.step();
    return cs.isEmpty();
  }
  if (inMarkup) this.writeTextMarkup(text);
  else if (isIdent()) this.writeIdent(text);
  else this.writeString(text);
};
ReconWriter.prototype.writeString = function (string) {
  var cs = new StringIterator(string);
  this.builder.append(34/*'"'*/);
  while (!cs.isEmpty()) {
    var c = cs.head();
    switch (c) {
      case 34/*'"'*/:
      case 92/*'\\'*/: this.builder.append(92/*'\\'*/); this.builder.append(c); break;
      case 8/*'\b'*/: this.builder.append(92/*'\\'*/); this.builder.append(98/*'b'*/); break;
      case 12/*'\f'*/: this.builder.append(92/*'\\'*/); this.builder.append(102/*'f'*/); break;
      case 10/*'\n'*/: this.builder.append(92/*'\\'*/); this.builder.append(110/*'n'*/); break;
      case 13/*'\r'*/: this.builder.append(92/*'\\'*/); this.builder.append(114/*'r'*/); break;
      case 9/*'\t'*/: this.builder.append(92/*'\\'*/); this.builder.append(116/*'t'*/); break;
      default: this.builder.append(c);
    }
    cs.step();
  }
  this.builder.append(34/*'"'*/);
};
ReconWriter.prototype.writeIdent = function (ident) {
  this.builder.appendString(ident);
};
ReconWriter.prototype.writeTextMarkup = function (text) {
  var cs = new StringIterator(text);
  this.builder.append(91/*'['*/);
  while (!cs.isEmpty()) {
    var c = cs.head();
    switch (c) {
      case 64/*'@'*/:
      case 91/*'['*/:
      case 92/*'\\'*/:
      case 93/*']'*/:
      case 123/*'{'*/:
      case 125/*'}'*/: this.builder.append(92/*'\\'*/); this.builder.append(c); break;
      default: this.builder.append(c);
    }
    cs.step();
  }
  this.builder.append(93/*']'*/);
};
ReconWriter.prototype.writeNumber = function (number) {
  this.builder.appendString(number.toString());
};
ReconWriter.prototype.writeData = function (data) {
  function encodeBase64Digit(x) {
    if      (x >=  0 && x < 26) return x + 65/*'A'*/;
    else if (x >= 26 && x < 52) return x + 71/*('a' - 26)*/;
    else if (x >= 52 && x < 62) return x - 4/*-('0' - 52)*/;
    else if (x === 62) return 43/*'+'*/;
    else if (x === 63) return 47/*'/'*/;
  }
  this.builder.append(37/*'%'*/);
  var i = 0;
  var n = data.length;
  var x, y, z;
  while (i + 2 < n) {
    x = data[i];
    y = data[i + 1];
    z = data[i + 2];
    this.builder.append(encodeBase64Digit(x >>> 2));
    this.builder.append(encodeBase64Digit(((x << 4) | (y >>> 4)) & 0x3F));
    this.builder.append(encodeBase64Digit(((y << 2) | (z >>> 6)) & 0x3F));
    this.builder.append(encodeBase64Digit(z & 0x3F));
    i += 3;
  }
  if (i + 1 < n) {
    x = data[i];
    y = data[i + 1];
    this.builder.append(encodeBase64Digit(x >>> 2));
    this.builder.append(encodeBase64Digit(((x << 4) | (y >>> 4)) & 0x3F));
    this.builder.append(encodeBase64Digit((y << 2) & 0x3F));
    this.builder.append(61/*'='*/);
    i += 2;
  }
  else if (i < n) {
    x = data[i];
    this.builder.append(encodeBase64Digit(x >>> 2));
    this.builder.append(encodeBase64Digit((x << 4) & 0x3F));
    this.builder.append(61/*'='*/);
    this.builder.append(61/*'='*/);
    i += 1;
  }
};
ReconWriter.prototype.state = function () {
  return this.builder.state();
};


module.exports = function (value) {
  return coerce(value);
};
exports = module.exports;
exports.parse = parse;
exports.stringify = stringify;
exports.objectify = objectify;
exports.Field = Field;
exports.Attr = Attr;
exports.Slot = Slot;
exports.Record = Record;
exports.Extant = Extant;
exports.Absent = Absent;
exports.RecordBuilder = RecordBuilder;
exports.ValueBuilder = ValueBuilder;