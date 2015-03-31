'use strict';
/* global describe: false */
/* global it: false */

var assert = require('assert');
var recon = require('./recon.js');
var parse = recon.parse;
var stringify = recon.stringify;
var objectify = recon.objectify;
var base64 = recon.base64;
var attr = recon.attr;
var slot = recon.slot;
var extant = recon.extant;
var absent = recon.absent;
var empty = recon.empty;
var builder = recon.builder;

assert.same = function (x, y) {
  if (!recon.compare(x, y))
    assert.fail(false, true, recon.stringify(x) +' did not equal '+ recon.stringify(y));
};


describe('Recon coercion', function () {
  it('should coerce undefined values', function () {
    assert.same(recon(), absent);
  });

  it('should coerce null values', function () {
    assert.same(recon(null), extant);
  });

  it('should coerce empty objects', function () {
    assert.same(recon({}), empty());
  });

  it('should coerce non-empty objects', function () {
    assert.same(recon({a: 1}), recon(slot('a', 1)));
    assert.same(recon({a: 1, b: 2}), recon(slot('a', 1), slot('b', 2)));
  });

  it('should coerce objects with @ member', function () {
    assert.same(recon({'@': {'answer': 42}}), recon(attr('answer', 42)));
    assert.same(recon({'@': {'answer': 42}, 'points': 2}), recon(attr('answer', 42), slot('points', 2)));
  });

  it('should coerce objects using #toRecon() methods', function () {
    var object = {
      toRecon: function () {
        return 'special';
      }
    };
    assert.same(recon(object), 'special');
  });

  it('should coerce empty arrays', function () {
    assert.same(recon([]), empty());
  });

  it('should coerce non-empty arrays', function () {
    assert.same(recon([1, true]), recon(1, true));
  });

  it('should coerce other values as absent', function () {
    assert.same(recon(function () {}), absent);
  });

  it('should coerce recon values as identity', function () {
    assert.same(recon(empty()), empty());
    assert.same(recon(''), '');
    assert.same(recon(0), 0);
    assert.same(recon(true), true);
    assert.same(recon(false), false);
    assert.same(recon(base64()), base64());
  });

  it('should build records', function () {
    assert.same(
      builder().attr('a', 1).slot('b', 2).item(3).state(),
      recon(attr('a', 1), slot('b', 2), 3));
  });

  it('should append records to record builders', function () {
    var record = builder();
    record.item(1);
    record.appendRecord(recon(2, slot('c', 3)));
    assert.same(record.state(), recon(1, 2, slot('c', 3)));
  });

  it('should convert iterators to records', function () {
    var items = recon([1, 2, 3]).iterator();
    items.step();
    assert.same(items.toRecord(), recon([2, 3]));
  });

  it('should objectify extant values', function () {
    assert.equal(objectify(extant), null);
  });

  it('should objectify absent values', function () {
    assert.equal(objectify(absent), null);
  });

  it('should objectify empty records', function () {
    assert.deepEqual(objectify(empty()), {});
  });

  it('should objectify array-like records', function () {
    assert.deepEqual(objectify(recon(1, 2)), [1, 2]);
  });

  it('should objectify object-like records', function () {
    assert.deepEqual(objectify(recon(slot('a', 1))), {a: 1});
  });

  it('should objectify records with attributes', function () {
    assert.deepEqual(objectify(recon(attr('a', 1))), {'@': {a: 1}});
    assert.deepEqual(objectify(recon(attr('a', 1), attr('b', 2))), {'@': {a: 1, b: 2}});
  });

  it('should objectify partially keyed records', function () {
    assert.deepEqual(objectify(recon(slot('a', 0), true)), {a: 0, 1: true});
  });
});


describe('Recon records', function () {
  it('should know their empty status', function () {
    assert.equal(empty().isEmpty(), true);
    assert.equal(recon(1, 2).isEmpty(), false);
  });

  it('should know their size', function () {
    assert.equal(empty().size, 0);
    assert.equal(recon(1, 2).size, 2);
    assert.equal(recon(1, 2, 3).size, 3);
  });

  it('should know if they have prefix attributes', function () {
    assert(recon(attr('x')).hasPrefixAttrs());
    assert(recon(attr('x'), true).hasPrefixAttrs());
    assert(!recon(1, 2).hasPrefixAttrs());
  });

  it('should know if they have postfix attributes', function () {
    assert(recon(attr('a')).hasPostfixAttrs());
    assert(recon(true, attr('a')).hasPostfixAttrs());
    assert(!recon(1, 2).hasPostfixAttrs());
  });

  it('should know which keys they contain', function () {
    var record = recon(1, 2, slot('c', 3), slot(6, 4), 5);
    assert(record.contains(0));
    assert(record.contains(1));
    assert(record.contains(2));
    assert(record.contains(3));
    assert(record.contains(4));
    assert(!record.contains(5));
    assert(record.contains('c'));
    assert(record.contains(6));
    assert(!record.contains('d'));
  });

  it('should have a head item', function () {
    assert.same(recon([1, 2]).head(), 1);
    assert.same(recon([1]).head(), 1);
    assert.same(empty().head(), absent);
  });

  it('should have a tail record', function () {
    assert.same(recon([1, 2, 3]).tail(), recon([2, 3]));
    assert.same(recon([1, 2, 3]).tail().tail(), recon([3]));
    assert.same(recon([1, 2, 3]).tail().tail().tail(), empty());
  });

  it('should have a body record', function () {
    assert.same(recon([1, 2, 3]).body(), recon([1, 2]));
    assert.same(recon([1, 2, 3]).body().body(), recon([1]));
    assert.same(recon([1, 2, 3]).body().body().body(), empty());
  });

  it('should have a foot item', function () {
    assert.same(recon([1, 2]).foot(), 2);
    assert.same(recon([1]).foot(), 1);
    assert.same(empty().foot(), absent);
  });

  it('should have a target value', function () {
    assert.same(recon([42]).target(), 42);
    assert.same(recon(attr('answer'), 42).target(), 42);
    assert.same(recon(attr('x')).target(), absent);
  });

  it('should concatenate items', function () {
    assert.same(recon(1, 2).concat(3), recon(1, 2, 3));
    assert.same(recon(1, 2).concat(3, 4), recon(1, 2, 3, 4));
    assert.same(recon(1, 2).concat(slot('c', 3)), recon(1, 2, slot('c', 3)));
    assert.same(recon(1, 2).concat(recon(3, 4)), recon(1, 2, 3, 4));
    assert.same(recon(1, 2).concat(recon(slot('c', 3), 4)), recon(1, 2, slot('c', 3), 4));
  });

  it('should have a field index', function () {
    assert.same(new recon.Record([1, 2, 3, slot('a', 1)])('a'), 1);
  });

  it('should lookup attributes by name', function () {
    var record = recon(attr('answer', 42));
    assert.same(record('answer'), 42);
  });

  it('should lookup slots by name', function () {
    var record = recon(slot('answer', 42));
    assert.same(record('answer'), 42);
  });

  it('should lookup items index', function () {
    var record = recon(1, 2, 3);
    assert.same(record(0), 1);
    assert.same(record(1), 2);
    assert.same(record(2), 3);
  });

  it('should lookup attributes by index', function () {
    var record = recon(attr('answer', 42));
    assert.same(record(0), attr('answer', 42));
  });

  it('should lookup slots by index', function () {
    var record = recon(slot('answer', 42));
    assert.same(record(0), slot('answer', 42));
  });

  it('should traverse each item', function () {
    var sum = 0;
    recon(2, 3, 5, 7).forEach(function (x) { sum += x; });
    assert.equal(sum, 17);
  });
});

describe('Recon parser', function () {
  it('should parse empty input', function () {
    assert.same(parse(''), absent);
  });

  it('should parse empty records', function () {
    assert.same(parse('{}'), empty());
  });

  it('should parse empty markup', function () {
    assert.same(parse('[]'), empty());
  });

  it('should parse empty strings', function () {
    assert.same(parse('""'), '');
  });

  it('should parse non-empty strings', function () {
    assert.same(parse('"test"'), 'test');
  });

  it('should parse strings with escapes', function () {
    assert.same(parse('"\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t"'), '"\\/@{}[]\b\f\n\r\t');
  });

  it('should parse unicode identifiers', function () {
    assert.same(parse('À'), 'À'); // U+C0
    assert.same(parse('Ö'), 'Ö'); // U+D6
    assert.same(parse('Ø'), 'Ø'); // U+D8
    assert.same(parse('ö'), 'ö'); // U+F6
    assert.same(parse('ø'), 'ø'); // U+F8
    assert.same(parse('˿'), '˿'); // U+2FF
    assert.same(parse('Ͱ'), 'Ͱ'); // U+370
    assert.same(parse('ͽ'), 'ͽ'); // U+37D
    assert.same(parse('Ϳ'), 'Ϳ'); // U+37F
    assert.same(parse('῿'), '῿'); // U+1FFF
    assert.same(parse('⁰'), '⁰'); // U+2070
    assert.same(parse('↏'), '↏'); // U+218F
    assert.same(parse('Ⰰ'), 'Ⰰ'); // U+2C00
    assert.same(parse('⿯'), '⿯'); // U+2FEF
    assert.same(parse('、'), '、'); // U+3001
    assert.same(parse('퟿'), '퟿'); // U+D7FF
    assert.same(parse('豈'), '豈'); // U+F900
    assert.same(parse('﷏'), '﷏'); // U+FDCF
    assert.same(parse('ﷰ'), 'ﷰ'); // U+FDF0
    assert.same(parse('𐀀'), '𐀀'); // U+10000
    assert.same(parse('󯿿'), '󯿿'); // U+EFFFF

    assert.same(parse('_À'), '_À'); // U+C0
    assert.same(parse('_Ö'), '_Ö'); // U+D6
    assert.same(parse('_Ø'), '_Ø'); // U+D8
    assert.same(parse('_ö'), '_ö'); // U+F6
    assert.same(parse('_ø'), '_ø'); // U+F8
    assert.same(parse('_˿'), '_˿'); // U+2FF
    assert.same(parse('_Ͱ'), '_Ͱ'); // U+370
    assert.same(parse('_ͽ'), '_ͽ'); // U+37D
    assert.same(parse('_Ϳ'), '_Ϳ'); // U+37F
    assert.same(parse('_῿'), '_῿'); // U+1FFF
    assert.same(parse('_⁰'), '_⁰'); // U+2070
    assert.same(parse('_↏'), '_↏'); // U+218F
    assert.same(parse('_Ⰰ'), '_Ⰰ'); // U+2C00
    assert.same(parse('_⿯'), '_⿯'); // U+2FEF
    assert.same(parse('_、'), '_、'); // U+3001
    assert.same(parse('_퟿'), '_퟿'); // U+D7FF
    assert.same(parse('_豈'), '_豈'); // U+F900
    assert.same(parse('_﷏'), '_﷏'); // U+FDCF
    assert.same(parse('_ﷰ'), '_ﷰ'); // U+FDF0
    assert.same(parse('_𐀀'), '_𐀀'); // U+10000
    assert.same(parse('_󯿿'), '_󯿿'); // U+EFFFF
  });

  it('should parse empty data', function () {
    assert.same(parse('%'), base64());
  });

  it('should parse non-empty data', function () {
    assert.same(parse('%AAAA'), base64('AAAA'));
    assert.same(parse('%AAA='), base64('AAA='));
    assert.same(parse('%AA=='), base64('AA=='));
    assert.same(parse('%ABCDabcd12/+'), base64('ABCDabcd12/+'));
  });

  it('should parse positive integers', function () {
    assert.same(parse('0'), 0);
    assert.same(parse('1'), 1);
    assert.same(parse('5'), 5);
    assert.same(parse('10'), 10);
    assert.same(parse('11'), 11);
    assert.same(parse('15'), 15);
  });

  it('should parse negative integers', function () {
    assert.same(parse('-0'), -0);
    assert.same(parse('-1'), -1);
    assert.same(parse('-5'), -5);
    assert.same(parse('-10'), -10);
    assert.same(parse('-11'), -11);
    assert.same(parse('-15'), -15);
  });

  it('should parse positive decimals', function () {
    assert.same(parse('0.0'), 0.0);
    assert.same(parse('0.5'), 0.5);
    assert.same(parse('1.0'), 1.0);
    assert.same(parse('1.5'), 1.5);
    assert.same(parse('1.05'), 1.05);
    assert.same(parse('10.0'), 10.0);
    assert.same(parse('10.5'), 10.5);
  });

  it('should parse negative decimals', function () {
    assert.same(parse('-0.0'), -0.0);
    assert.same(parse('-0.5'), -0.5);
    assert.same(parse('-1.0'), -1.0);
    assert.same(parse('-1.5'), -1.5);
    assert.same(parse('-1.05'), -1.05);
    assert.same(parse('-10.0'), -10.0);
    assert.same(parse('-10.5'), -10.5);
  });

  it('should parse positive decimals with exponents', function () {
    assert.same(parse('4e2'), 4e2);
    assert.same(parse('4E2'), 4E2);
    assert.same(parse('4e+2'), 4e+2);
    assert.same(parse('4E+2'), 4E+2);
    assert.same(parse('4e-2'), 4e-2);
    assert.same(parse('4E-2'), 4E-2);
    assert.same(parse('4.0e2'), 4.0e2);
    assert.same(parse('4.0E2'), 4.0E2);
    assert.same(parse('4.0e+2'), 4.0e+2);
    assert.same(parse('4.0E+2'), 4.0E+2);
    assert.same(parse('4.0e-2'), 4.0e-2);
    assert.same(parse('4.0E-2'), 4.0E-2);
  });

  it('should parse negative decimals with exponents', function () {
    assert.same(parse('-4e2'), -4e2);
    assert.same(parse('-4E2'), -4E2);
    assert.same(parse('-4e+2'), -4e+2);
    assert.same(parse('-4E+2'), -4E+2);
    assert.same(parse('-4e-2'), -4e-2);
    assert.same(parse('-4E-2'), -4E-2);
    assert.same(parse('-4.0e2'), -4.0e2);
    assert.same(parse('-4.0E2'), -4.0E2);
    assert.same(parse('-4.0e+2'), -4.0e+2);
    assert.same(parse('-4.0E+2'), -4.0E+2);
    assert.same(parse('-4.0e-2'), -4.0e-2);
    assert.same(parse('-4.0E-2'), -4.0E-2);
    assert.same(parse('-4.0e02'), -4.0e2);
    assert.same(parse('-4.0E02'), -4.0E2);
    assert.same(parse('-4.0e+02'), -4.0e+2);
    assert.same(parse('-4.0E+02'), -4.0E+2);
    assert.same(parse('-4.0e-02'), -4.0e-2);
    assert.same(parse('-4.0E-02'), -4.0E-2);
  });

  it('should parse booleans', function () {
    assert.same(parse('true'), true);
    assert.same(parse('false'), false);
  });

  it('should parse single values with trailing commas', function () {
    assert.same(parse('1,'), 1);
  });

  it('should parse single values with trailing semicolons', function () {
    assert.same(parse('1;'), 1);
  });

  it('should parse multiple comma separated items', function () {
    assert.same(parse('  1, 2,3 ,4  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1, 2,3 ,4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple semicolon separated items', function () {
    assert.same(parse('  1; 2;3 ;4  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1; 2;3 ;4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with trailing commas', function () {
    assert.same(parse('  1, 2,3 ,4,  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1, 2,3 ,4, }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with trailing semicolons', function () {
    assert.same(parse('  1, 2,3 ,4;  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1, 2,3 ,4; }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple newline separated items', function () {
    assert.same(parse('  1\n 2\n3 \n4  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1\n 2\n3 \n4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with mixed separators', function () {
    assert.same(parse('  1, 2\n3 \n4; 5  '), recon(1, 2, 3, 4, 5));
    assert.same(parse('{ 1, 2\n3 \n4; 5 }'), recon(1, 2, 3, 4, 5));
  });

  it('should parse multiple comma-newline separated items', function () {
    assert.same(parse('  1,\n 2,\n3 ,\n4  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1,\n 2,\n3 ,\n4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple semicolon-newline separated items', function () {
    assert.same(parse('  1;\n 2;\n3 ;\n4  '), recon(1, 2, 3, 4));
    assert.same(parse('{ 1;\n 2;\n3 ;\n4 }'), recon(1, 2, 3, 4));
  });

  it('should parse heterogeneous top-level items as a record', function () {
    var string =
      '  record: {}  \n'+
      '  markup: []  \n'+
      '  ""          \n'+
      '  %AA==       \n'+
      '  integer: 0  \n'+
      '  decimal: 0.0\n'+
      '  true        \n'+
      '  false         ';
    var record = recon(
      slot('record', empty()),
      slot('markup', empty()),
      '',
      base64('AA=='),
      slot('integer', 0),
      slot('decimal', 0.0),
      true,
      false
    );
    assert.same(parse(string), record);
  });

  it('should parse interpolate heterogeneous items in a record', function () {
    var string =
      '{             \n'+
      '  record: {}  \n'+
      '  markup: []  \n'+
      '  ""          \n'+
      '  %AA==       \n'+
      '  integer: 0  \n'+
      '  decimal: 0.0\n'+
      '  true        \n'+
      '  false         '+
      '}                ';
    var record = recon(
      slot('record', empty()),
      slot('markup', empty()),
      '',
      base64('AA=='),
      slot('integer', 0),
      slot('decimal', 0.0),
      true,
      false
    );
    assert.same(parse(string), record);
  });

  it('should parse single extant attributes with no parameters', function () {
    assert.same(parse('@test'), recon(attr('test')));
  });

  it('should parse single extant attributes with empty parameters', function () {
    assert.same(parse('@test()'), recon(attr('test')));
  });

  it('should parse single extant attributes with single parameters', function () {
    assert.same(parse('@hello({})'), recon(attr('hello', empty())));
    assert.same(parse('@hello([world])'), recon(attr('hello', recon(['world']))));
    assert.same(parse('@hello("world")'), recon(attr('hello', 'world')));
    assert.same(parse('@hello(42)'), recon(attr('hello', 42)));
    assert.same(parse('@hello(true)'), recon(attr('hello', true)));
    assert.same(parse('@hello(false)'), recon(attr('hello', false)));
  });

  it('should parse single extant attributes with multiple parameters', function () {
    var record = recon(attr('hello', recon('world', base64('AA=='), 42, true)));
    assert.same(parse('@hello("world", %AA==, 42, true)'), record);
    assert.same(parse('@hello("world"; %AA==; 42; true)'), record);
    assert.same(parse('@hello("world"\n%AA==\n42\ntrue)'), record);
  });

  it('should parse single extant attributes with named parameters', function () {
    assert.same(parse('@hello(name: "world")'), recon(attr('hello', recon(slot('name', 'world')))));
    assert.same(parse('@hello(name: "world", data: %AA==, number: 42, false)'), recon(
      attr('hello', recon(slot('name', 'world'), slot('data', base64('AA==')), slot('number', 42), false))));
  });

  it('should parse multiple extant attributes with no parameters', function () {
    assert.same(parse('@a @b'), recon(attr('a'), attr('b')));
  });

  it('should parse multiple extant attributes with empty parameters', function () {
    assert.same(parse('@a() @b()'), recon(attr('a'), attr('b')));
  });

  it('should parse multiple extant attributes with single parameters', function () {
    assert.same(parse('@a({}) @b([])'), recon(attr('a', empty()), attr('b', empty())));
    assert.same(parse('@a("test") @b(42)'), recon(attr('a', 'test'), attr('b', 42)));
    assert.same(parse('@a(true) @b(false)'), recon(attr('a', true), attr('b', false)));
  });

  it('should parse multiple extant attributes with complex parameters', function () {
    assert.same(parse('@hello("world", 42) @test(name: "parse", pending: false)'), recon(
      attr('hello', recon('world', 42)),
      attr('test', recon(slot('name', 'parse'), slot('pending', false)))));
  });

  it('should parse attributed empty records', function () {
    assert.same(parse('@hello {}'), recon(attr('hello')));
    assert.same(parse('@hello() {}'), recon(attr('hello')));
    assert.same(parse('@hello("world") {}'), recon(attr('hello', 'world')));
    assert.same(parse('@hello(name: "world") {}'), recon(attr('hello', recon(slot('name', 'world')))));
  });

  it('should parse attributed non-empty records', function () {
    assert.same(parse('@hello { {}, [] }'), recon(attr('hello'), empty(), empty()));
    assert.same(parse('@hello() { "world", 42 }'), recon(attr('hello'), 'world', 42));
    assert.same(parse('@hello(name: "world") { number: 42, true }'), recon(
      attr('hello', recon(slot('name', 'world'))), slot('number', 42), true));
  });

  it('should parse attributed empty markup', function () {
    assert.same(parse('@hello []'), recon(attr('hello')));
    assert.same(parse('@hello() []'), recon(attr('hello')));
    assert.same(parse('@hello("world") []'), recon(attr('hello', 'world')));
    assert.same(parse('@hello(name: "world") []'), recon(attr('hello', recon(slot('name', 'world')))));
  });

  it('should parse attributed empty strings', function () {
    assert.same(parse('@hello ""'), recon(attr('hello'), ''));
    assert.same(parse('@hello() ""'), recon(attr('hello'), ''));
    assert.same(parse('@hello("world") ""'), recon(attr('hello', 'world'), ''));
    assert.same(parse('@hello(name: "world") ""'), recon(attr('hello', recon(slot('name', 'world'))), ''));
  });

  it('should parse attributed non-empty strings', function () {
    assert.same(parse('@hello "test"'), recon(attr('hello'), 'test'));
    assert.same(parse('@hello() "test"'), recon(attr('hello'), 'test'));
    assert.same(parse('@hello("world") "test"'), recon(attr('hello', 'world'), 'test'));
    assert.same(parse('@hello(name: "world") "test"'), recon(attr('hello', recon(slot('name', 'world'))), 'test'));
  });

  it('should parse attributed empty data', function () {
    assert.same(parse('@hello %'), recon(attr('hello'), base64()));
    assert.same(parse('@hello() %'), recon(attr('hello'), base64()));
    assert.same(parse('@hello("world") %'), recon(attr('hello', 'world'), base64()));
    assert.same(parse('@hello(name: "world") %'), recon(attr('hello', recon(slot('name', 'world'))), base64()));
  });

  it('should parse attributed non-empty data', function () {
    assert.same(parse('@hello %AA=='), recon(attr('hello'), base64('AA==')));
    assert.same(parse('@hello() %AAA='), recon(attr('hello'), base64('AAA=')));
    assert.same(parse('@hello("world") %AAAA'), recon(attr('hello', 'world'), base64('AAAA')));
    assert.same(parse('@hello(name: "world") %ABCDabcd12+/'), recon(
      attr('hello', recon(slot('name', 'world'))), base64('ABCDabcd12+/')));
  });

  it('should parse attributed numbers', function () {
    assert.same(parse('@hello 42'), recon(attr('hello'), 42));
    assert.same(parse('@hello() -42'), recon(attr('hello'), -42));
    assert.same(parse('@hello("world") 42.0'), recon(attr('hello', 'world'), 42.0));
    assert.same(parse('@hello(name: "world") -42.0'), recon(attr('hello', recon(slot('name', 'world'))), -42.0));
  });

  it('should parse attributed booleans', function () {
    assert.same(parse('@hello true'), recon(attr('hello'), true));
    assert.same(parse('@hello() false'), recon(attr('hello'), false));
    assert.same(parse('@hello("world") true'), recon(attr('hello', 'world'), true));
    assert.same(parse('@hello(name: "world") false'), recon(attr('hello', recon(slot('name', 'world'))), false));
  });

  it('should parse postfix attributed empty records', function () {
    assert.same(parse('{} @signed'), recon(attr('signed')));
    assert.same(parse('{} @signed()'), recon(attr('signed')));
    assert.same(parse('{} @signed("me")'), recon(attr('signed', 'me')));
    assert.same(parse('{} @signed(by: "me")'), recon(attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed non-empty records', function () {
    assert.same(parse('{ {}, [] } @signed'), recon(empty(), empty(), attr('signed')));
    assert.same(parse('{ "world", 42 } @signed()'), recon('world', 42, attr('signed')));
    assert.same(parse('{ number: 42, true } @signed(by: "me")'), recon(
      slot('number', 42), true, attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed empty markup', function () {
    assert.same(parse('[] @signed'), recon(attr('signed')));
    assert.same(parse('[] @signed()'), recon(attr('signed')));
    assert.same(parse('[] @signed("me")'), recon(attr('signed', 'me')));
    assert.same(parse('[] @signed(by: "me")'), recon(attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed empty strings', function () {
    assert.same(parse('"" @signed'), recon('', attr('signed')));
    assert.same(parse('"" @signed()'), recon('', attr('signed')));
    assert.same(parse('"" @signed("me")'), recon('', attr('signed', 'me')));
    assert.same(parse('"" @signed(by: "me")'), recon('', attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed non-empty strings', function () {
    assert.same(parse('"test" @signed'), recon('test', attr('signed')));
    assert.same(parse('"test" @signed()'), recon('test', attr('signed')));
    assert.same(parse('"test" @signed("me")'), recon('test', attr('signed', 'me')));
    assert.same(parse('"test" @signed(by: "me")'), recon('test', attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed empty data', function () {
    assert.same(parse('% @signed'), recon(base64(), attr('signed')));
    assert.same(parse('% @signed()'), recon(base64(), attr('signed')));
    assert.same(parse('% @signed("me")'), recon(base64(), attr('signed', 'me')));
    assert.same(parse('% @signed(by: "me")'), recon(base64(), attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed non-empty data', function () {
    assert.same(parse('%AA== @signed'), recon(base64('AA=='), attr('signed')));
    assert.same(parse('%AAA= @signed()'), recon(base64('AAA='), attr('signed')));
    assert.same(parse('%AAAA @signed("me")'), recon(base64('AAAA'), attr('signed', 'me')));
    assert.same(parse('%ABCDabcd12+/ @signed(by: "me")'), recon(
      base64('ABCDabcd12+/'), attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed numbers', function () {
    assert.same(parse('42 @signed'), recon(42, attr('signed')));
    assert.same(parse('-42 @signed()'), recon(-42, attr('signed')));
    assert.same(parse('42.0 @signed("me")'), recon(42.0, attr('signed', 'me')));
    assert.same(parse('-42.0 @signed(by: "me")'), recon(-42.0, attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse postfix attributed booleans', function () {
    assert.same(parse('true @signed'), recon(true, attr('signed')));
    assert.same(parse('false @signed()'), recon(false, attr('signed')));
    assert.same(parse('true @signed("me")'), recon(true, attr('signed', 'me')));
    assert.same(parse('false @signed(by: "me")'), recon(false, attr('signed', recon(slot('by', 'me')))));
  });

  it('should parse plain markup', function () {
    assert.same(parse('[test]'), recon(['test']));
  });

  it('should parse plain markup with escapes', function () {
    assert.same(parse('[\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t]'), recon(['"\\/@{}[]\b\f\n\r\t']));
  });

  it('should parse markup with embedded markup', function () {
    assert.same(parse('[Hello, [good] world!]'), recon('Hello, ', 'good', ' world!'));
  });

  it('should parse markup with embedded structure', function () {
    assert.same(parse('[Hello{}world]'), recon('Hello', 'world'));
    assert.same(parse('[A: {"answer"}.]'), recon('A: ', 'answer', '.'));
    assert.same(parse('[A: {%AA==}.]'), recon('A: ', base64('AA=='), '.'));
    assert.same(parse('[A: {42}.]'), recon('A: ', 42, '.'));
    assert.same(parse('[A: {true}.]'), recon('A: ', true, '.'));
    assert.same(parse('[A: {false}.]'), recon('A: ', false, '.'));
    assert.same(parse('[A: {answer:0.0}.]'), recon('A: ', slot('answer', 0.0), '.'));
    assert.same(parse('[{1, 2, 3}]'), recon(1, 2, 3));
    assert.same(parse('[{{1, 2, 3}}.]'), recon(recon(1, 2, 3), '.'));
  });

  it('should parse markup with embedded attributes', function () {
    assert.same(parse('[A: @answer.]'), recon('A: ', recon(attr('answer')), '.'));
    assert.same(parse('[A: @answer().]'), recon('A: ', recon(attr('answer')), '.'));
    assert.same(parse('[A: @answer("secret").]'), recon('A: ', recon(attr('answer', 'secret')), '.'));
    assert.same(parse('[A: @answer(number: 42, true).]'), recon(
      'A: ', recon(attr('answer', recon(slot('number', 42), true))), '.'));
    assert.same(parse('[@numbers {1, 2, 3}.]'), recon(recon(attr('numbers'), 1, 2, 3), '.'));
    assert.same(parse('[@numbers {{1, 2, 3}}.]'), recon(recon(attr('numbers'), recon(1, 2, 3)), '.'));
  });

  it('should parse markup with embedded attributed markup', function () {
    assert.same(parse('[Hello, @em[world]!]'), recon('Hello, ', recon(attr('em'), 'world'), '!'));
    assert.same(parse('[Hello, @em() [world]!]'), recon('Hello, ', recon(attr('em'), 'world'), '!'));
    assert.same(parse('[Hello, @em("italic")[world]!]'), recon(
      'Hello, ', recon(attr('em', 'italic'), 'world'), '!'));
    assert.same(parse('[Hello, @em(class:"subject",style:"italic")[world]!]'), recon(
      'Hello, ', recon(attr('em', recon(slot('class', 'subject'), slot('style', 'italic'))), 'world'), '!'));
  });

  it('should parse markup with embedded attributed values', function () {
    assert.same(parse('[A: @answer{42}.]'), recon('A: ', recon(attr('answer'), 42), '.'));
    assert.same(parse('[A: @answer() {42}.]'), recon('A: ', recon(attr('answer'), 42), '.'));
    assert.same(parse('[A: @answer("secret") {42}.]'), recon('A: ', recon(attr('answer', 'secret'), 42), '.'));
    assert.same(parse('[A: @answer(number: 42, "secret") {true}.]'), recon(
      'A: ', recon(attr('answer', recon(slot('number', 42), 'secret')), true), '.'));
  });
});

describe('Recon serializer', function () {
  it('should stringify absent values', function () {
    assert.equal(stringify(absent), '');
  });

  it('should stringify empty records', function () {
    assert.equal(stringify(empty()), '');
    assert.equal(stringify(slot('test', empty())), 'test:{}');
  });

  it('should stringify non-empty records', function () {
    assert.equal(stringify(1, 2, '3', true), '1,2,"3",true');
  });

  it('should stringify empty strings', function () {
    assert.equal(stringify(''), '""');
  });

  it('should stringify non-empty strings', function () {
    assert.equal(stringify('Hello, world!'), '"Hello, world!"');
  });

  it('should stringify strings with escapes', function () {
    assert.equal(stringify('"\\\b\f\n\r\t'), '"\\"\\\\\\b\\f\\n\\r\\t"');
  });

  it('should stringify identifiers', function () {
    assert.equal(stringify('test'), 'test');
  });

  it('should stringify empty data', function () {
    assert.equal(stringify(base64()), '%');
  });

  it('should stringify non-empty data', function () {
    assert.equal(stringify(base64('AAAA')), '%AAAA');
    assert.equal(stringify(base64('AAA=')), '%AAA=');
    assert.equal(stringify(base64('AA==')), '%AA==');
    assert.equal(stringify(base64('ABCDabcd12/+')), '%ABCDabcd12/+');
  });

  it('should stringify numbers', function () {
    assert.equal(stringify(0), '0');
    assert.equal(stringify(1), '1');
    assert.equal(stringify(-1), '-1');
    assert.equal(stringify(15), '15');
    assert.equal(stringify(-20), '-20');
    assert.equal(stringify(3.14), '3.14');
    assert.equal(stringify(-0.5), '-0.5');
    assert.equal(stringify(6.02E23), '6.02e+23');
  });

  it('should stringify booleans', function () {
    assert.equal(stringify(true), 'true');
    assert.equal(stringify(false), 'false');
  });

  it('should stringify extant attributes with no parameters', function () {
    assert.equal(stringify(attr('answer')), '@answer');
  });

  it('should stringify extant attributes with single parameters', function () {
    assert.equal(stringify(attr('answer', empty())), '@answer()');
    assert.equal(stringify(attr('answer', '42')), '@answer("42")');
    assert.equal(stringify(attr('answer', 42)), '@answer(42)');
    assert.equal(stringify(attr('answer', true)), '@answer(true)');
  });

  it('should stringify extant attributes with multiple parameters', function () {
    assert.equal(stringify(attr('answer', recon(42, true))), '@answer(42,true)');
  });

  it('should stringify extant attributes with named parameters', function () {
    assert.equal(stringify(attr('answer', recon(slot('number', 42)))), '@answer(number:42)');
  });

  it('should stringify records with ident keyed slots', function () {
    assert.equal(stringify(slot('a', 1)), 'a:1');
    assert.equal(stringify(slot('a', 1), false, slot('c', 3)), 'a:1,false,c:3');
    assert.equal(stringify(slot('test', recon(slot('a', 1)))), 'test:{a:1}');
    assert.equal(stringify(slot('test', recon(slot('a', 1), false, slot('c', 3)))), 'test:{a:1,false,c:3}');
  });

  it('should stringify records with value keyed slots', function () {
    assert.equal(stringify(slot(1, 'one'), slot(recon(attr('id'), 'foo'), 'bar')), '1:one,@id foo:bar');
    assert.equal(
      stringify(slot('test', recon(slot(1, 'one'), slot(recon(attr('id'), 'foo'), 'bar')))),
      'test:{1:one,@id foo:bar}');
  });

  it('should stringify records with extant slots', function () {
    assert.equal(stringify(slot('blank')), 'blank:');
  });

  it('should stringify attributed empty records', function () {
    assert.equal(stringify(attr('hello'), empty()), '@hello{{}}');
    assert.equal(stringify(slot('test', recon(attr('hello'), empty()))), 'test:@hello{{}}');
  });

  it('should stringify attributed empty text', function () {
    assert.equal(stringify(attr('hello'), ''), '@hello ""');
    assert.equal(stringify(slot('test', recon(attr('hello'), ''))), 'test:@hello ""');
  });

  it('should stringify attributed non-empty text', function () {
    assert.equal(stringify(attr('hello'), 'world!'), '@hello "world!"');
    assert.equal(stringify(slot('test', recon(attr('hello'), 'world!'))), 'test:@hello "world!"');
  });

  it('should stringify attributed numbers', function () {
    assert.equal(stringify(attr('answer'), 42), '@answer 42');
    assert.equal(stringify(slot('test', recon(attr('answer'), 42))), 'test:@answer 42');
  });

  it('should stringify attributed booleans', function () {
    assert.equal(stringify(attr('answer'), true), '@answer true');
    assert.equal(stringify(slot('test', recon(attr('answer'), true))), 'test:@answer true');
  });

  it('should stringify attributed slots', function () {
    assert.equal(stringify(attr('hello'), slot('subject', 'world!')), '@hello{subject:\"world!\"}');
    assert.equal(
      stringify(slot('test', recon(attr('hello'), slot('subject', 'world!')))),
      'test:@hello{subject:\"world!\"}');
  });

  it('should stringify postfix attributed empty records', function () {
    assert.equal(stringify(empty(), attr('signed')), '{{}}@signed');
    assert.equal(stringify(slot('test', recon(empty(), attr('signed')))), 'test:{{}}@signed');
  });

  it('should stringify postfix attributed empty text', function () {
    assert.equal(stringify('', attr('signed')), '""@signed');
    assert.equal(stringify(slot('test', recon('', attr('signed')))), 'test:""@signed');
  });

  it('should stringify postfix attributed non-empty text', function () {
    assert.equal(stringify('world!', attr('signed')), '"world!"@signed');
    assert.equal(stringify(slot('test', recon('world!', attr('signed')))), 'test:"world!"@signed');
  });

  it('should stringify postfix attributed numbers', function () {
    assert.equal(stringify(42, attr('signed')), '42@signed');
    assert.equal(stringify(slot('test', recon(42, attr('signed')))), 'test:42@signed');
  });

  it('should stringify postfix attributed booleans', function () {
    assert.equal(stringify(true, attr('signed')), 'true@signed');
    assert.equal(stringify(slot('test', recon(true, attr('signed')))), 'test:true@signed');
  });

  it('should stringify postfix attributed slots', function () {
    assert.equal(stringify(slot('subject', 'world!'), attr('signed')), '{subject:\"world!\"}@signed');
    assert.equal(
      stringify(slot('test', recon(slot('subject', 'world!'), attr('signed')))),
      'test:{subject:\"world!\"}@signed');
  });

  it('should stringify single values with multiple postfix attributes', function () {
    assert.equal(stringify(6, attr('months'), attr('remaining')), '6@months@remaining');
    assert.equal(
      stringify(slot('test', recon(6, attr('months'), attr('remaining')))),
      'test:6@months@remaining');
  });

  it('should stringify single values with circumfix attributes', function () {
    assert.equal(stringify(attr('a'), attr('b'), false, attr('x'), attr('y')), '@a@b false@x@y');
    assert.equal(
      stringify(slot('test', recon(attr('a'), attr('b'), false, attr('x'), attr('y')))),
      'test:@a@b false@x@y');
  });

  it('should stringify multiple items with multiple postfix attributes', function () {
    assert.equal(stringify(1, 2, attr('x'), attr('y')), '{1,2}@x@y');
    assert.equal(stringify(slot('test', recon(1, 2, attr('x'), attr('y')))), 'test:{1,2}@x@y');
  });

  it('should stringify multiple items with circumfix attributes', function () {
    assert.equal(stringify(attr('a'), attr('b'), 1, 2, attr('x'), attr('y')), '@a@b{1,2}@x@y');
    assert.equal(
      stringify(slot('test', recon(attr('a'), attr('b'), 1, 2, attr('x'), attr('y')))),
      'test:@a@b{1,2}@x@y');
  });

  it('should stringify markup', function () {
    assert.equal(
      stringify('Hello, ', recon(attr('em', slot('class', 'subject')), 'world'), '!'),
      '[Hello, @em(class:subject)[world]!]');
    assert.equal(
      stringify('A: ', recon(attr('answer'), slot('number', 42), true), '.'),
      '[A: @answer{number:42,true}.]');
    assert.equal(
      stringify('A: ', recon(attr('answer'), 42), '.'),
      '[A: @answer{42}.]');
    assert.equal(
      stringify(slot('msg', recon('Hello, ', recon(attr('em'), 'world'), '!'))),
      'msg:[Hello, @em[world]!]');
  });

  it('should stringify markup with structure', function () {
    assert.equal(stringify('A: ', 42, '!'), '[A: {42}!]');
    assert.equal(
      stringify(attr('greeting'), 'Hello, ', recon(attr('em'), 'world'), '!'),
      '@greeting[Hello, @em[world]!]');
  });

  it('should stringify markup in attribute parameters', function () {
    assert.equal(
      stringify(attr('msg', recon('Hello, ', recon(attr('em'), 'world'), '!'))),
      '@msg([Hello, @em[world]!])');
  });

  it('should stringify markup with escapes', function () {
    assert.equal(
      stringify('Escape: ', recon(attr('br')), ' \\@{}[]'),
      '[Escape: @br \\\\\\@\\{\\}\\[\\]]');
    assert.equal(
      stringify('Escape: ', recon(attr('span'), '\\@{}[]'), '!'),
      '[Escape: @span[\\\\\\@\\{\\}\\[\\]]!]');
  });

  it('should stringify naked attributes', function () {
    assert.equal(attr('answer', 42).toString(), '@answer(42)');
  });

  it('should stringify naked slots', function () {
    assert.equal(slot('answer', 42).toString(), 'answer:42');
  });
});
