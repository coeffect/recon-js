# Record Notation (RECON)

[![Build Status](https://travis-ci.org/coeffect/recon-js.svg?branch=master)](https://travis-ci.org/coeffect/recon-js) [![Coveralls Status](http://img.shields.io/coveralls/coeffect/recon-js/master.svg)](https://coveralls.io/r/coeffect/recon-js)

RECON brings attributes into the era of object notation, and provides a simple
grammar and uniform tree model for attributed text markup.  RECON aims to
combine the minimalism of JSON with the expressiveness of XML in a
human-friendly syntax.

## Language Quick Start

### Primtives

RECON has three primitive datatypes: _text_, _number_, and _data_.

#### Text

Text values can take one of three forms: _string_, _markup_, or _identifier_.

```recon
"string"
[markup]
identifier
```

#### Numbers

Numbers encode as decimal literals.

```recon
1
1.41
```

#### Data

RECON serializes binary data as base64 literals following an initial `%`.

```recon
%AA==
```

### Records

RECON's sole aggregate datatype, the _record_, plays the combined role of array
and associative array.  Think of a record as a partially keyed list.  The
example record below has two items: a "subject" field with value "Greetings",
followed by an unkeyed string.

```recon
{ subject: "Greetings", "Hello, Earthlings!" }
```

Newlines can separate items too, giving pretty-printed documents a cleaner look.

```recon
{
  subject: "Re: Greetings"
  "Hi Martians!"
}
```

Records support arbitrary values as slot keys.

```recon
{
  @planet Jupiter: {}
  @god Jupiter: {}
}
```

### Blocks

Top-level documents can omit the curly braces around a root record.  We call
the content of a record sans curly braces a _block_.  When a block contains
only a single item, the value of the block reduces to just the value of the
element it contains.  The example block below is equivalent to the example
record above.

```recon
subject: "Re: Greetings"
"Hi Martians!"
```

### Markup

Square brackets denote _markup_.  Markup is an inverted syntax for records,
with values embedded in text, instead of text embedded in records.

```recon
[Hello, @em[world]!]
```

Markup really is just an alternative encoding for records.  The above example
is exactly equivalent to the below example.

```recon
{ "Hello, "; @em "world"; "!" }
```

### Attributes

The @ sign introduces an attribute.  Attributes serve as syntactic sugar for
pulling key fields out in front of a record.  The previous markup example
further reduces to the form below.

```recon
{
  "Hello, ",
  {
    em:
    "world"
  },
  "!"
}
```

Note that the `em:` field has no value.  The RECON data model forms an
algebraic datatype.  Am unspecified value is said to be _extant_.  `Extant`
is one of the unit type constructors of the RECON algebraic datatype, the
other unit constructor being `Absent`.  Neither `Extant` nor `Absent` have
explicit syntax, but they play important roles in the RECON data model.
Think of `Extant` and `Absent` as more meaningful versions of `null`.

Of course, attributes can have values too.  Place attribute parameters in
parentheses following an attribute name.

```recon
@answer(42)
@event("onClick")
```

The above attributes desugar to:

```recon
{answer:42}
{event:"onClick"}
```

Attribute parentheses enclose a block, allowing them to contain keyed slots.
An example, with its desugared equivalent, follows.

```recon
@img(src: "tesseract.png", width: 10, height: 10, depth: 10, time: -1)

{
  img: {
    src: "tesseract.png"
    width: 10
    height: 10
    depth: 10
    time: -1
  }
}
```

When attributes precedes a value, the value gets appended to the record
holding the attributes.  The first unkeyed item in a record is also known as
the record's _target_.

```recon
@a(href:"example.com")[Some examples...]

{
  a: { href: "example.com" }
  "Some examples..."
}
```

Attributed records are concatenated to their preceding attributes.

```recon
@agent("007") @license("to-kill") {
  public-name: "Bond"
  private-name: @secret "James Bond"
}

{
  agent: "007"
  license: "to-kill"
  public-name: "Bond"
  private-name: {
    secret:
    "James Bond"
  }
}
```

## JavaScript Library

The RECON JavaScript library has no dependencies, and can run in any standard
JavaScript environment.  Use `npm` to incorporate the RECON JavaScript library
into Node.js projects.

```
npm install --save recon
```

```js
var recon = require('recon-js');

var record = recon.parse('[Welcome @a(href:"index.html")@em[home].]');
```

## JavaScript API

### recon(values)

Coerces one or more JavaScript values to a RECON value.  `string`, `number`,
`boolean`, and `Uint8Array` and valid RECON values pass through unchanged.
`object` and `Array` get recursively transformed to `recon.Record` values.

```js
recon(1, 2, 3); // {1,2,3}
recon({from: 'me', to: 'you'}); // '{from:me,to:you}'
recon('Hello, ', recon(recon.attr('em'), 'world'), '!'); // [Hello, @em[world]!]
recon({'@':{event: 'onClick'}, x: 23, y: 42}); // @event(onClick){x:23,y:42}
```

### recon.attr(key, value)

Coerces `key` and `value` and creates a `recon.Attr`.

### recon.slot(key, value)

Coerces `key` and `value` and creates a `recon.Slot`.

### recon.extant

Returns the singleton Extant value.

### recon.absent

Returns the singleton Absent value.

### recon.empty()

Returns an empty record.

### recon.base64(string)

Base64-decodes a `string` into a `Uint8Array`.

### recon.parse(string)

Parses a string for a RECON value.

### recon.stringify(value)

Serializes a JavaScript value as a RECON string.

### recon.objectify(value)

Transforms a RECON value to an approximate JSON object.  Note that JSON cannot
faithfully represent all RECON values.

### recon.builder()

Returns a RECON builder object.  Append attributes with `.attr(key, value)`,
slots with `.slot(key, value)`, and other items with `.item(value)`.  All input
keys and values will get coerced to RECON values.  Retrieve the built result
with `.state()`.

```js
recon.builder().attr('event', 'onClick').item('window').state(); // '@event(onClick) window'
```

## JavaScript Record API

```js
var record = recon.parse('@subject("Re: Greetings") "Hi Martians!"');
```

### record(key)

Lookups up an attribute or slot value by `key`; if `record` doesn't contain
`key`, and `key` is an integer, returns the item at index `key`.

```js
record('subject'); // 'Re: Greetings'
record(1); // 'Hi Martians!'
```

### record.isEmpty

Returns `true` if `record` has no items.

### record.size

Returns the number of items in `record`.

### record.each(function)

Calls `function` with each item in `record`.

```js
record.each(function (item) { console.log(item.toString()); });
// @subject("Re: Greetings")
// Hi Martians!
```

## Language Grammar

```
SP ::= #x20 | #x9

NL ::= #xA | #xD

WS ::= SP | NL

Char ::= [#x1-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]

NameStartChar ::=
  [A-Z] | "_" | [a-z] |
  [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] |
  [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] |
  [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] |
  [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]

NameChar ::=  NameStartChar | "-" | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]

MarkupChar ::= Char - ('\\' | '@' | '{' | '}' | '[' | ']')

StringChar ::= Char - ('"' | '\\' | '@' | '{' | '}' | '[' | ']' | '\b' | '\f' | '\n' | '\r' | '\t')

CharEscape ::= '\\' ('"' | '\\' | '/' | '@' | '{' | '}' | '[' | ']' | 'b' | 'f' | 'n' | 'r' | 't')

Base64Char ::= [A-Za-z0-9+/]

Block ::= WS* Slot SP* ((',' | ';' | NL) Block)? WS*

Attr ::= '@' Ident ('(' WS* Block WS* ')')?

Slot ::= BlockValue (SP* ':' SP* BlockValue)?

BlockValue ::= ((Attr SP* BlockValue) | Record | Markup | Ident | String | Number | Data)?

InlineValue ::= ((Attr SP* InlineValue) | Record | Markup)?

Record ::= '{' WS* Block WS* '}'

Markup ::= '[' (MarkupChar* | CharEscape | InlineValue)* ']'

String ::= '"' (StringChar* | CharEscape)* '"'

Data ::= '%' (Base64Char{4})* (Base64Char Base64Char ((Base64Char '=') | ('=' '=')))?

Number ::= '-'? (([1-9] [0-9]*) | [0-9]) ('.' [0-9]+)? (('E' | 'e') ('+' | '-')? [0-9]+)?

Ident ::= NameStartChar NameChar*
```
