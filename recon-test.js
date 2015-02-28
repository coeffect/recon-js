'use strict';
/* global describe: false */
/* global it: false */

var assert = require('assert');
var recon = require('./recon.js');
var parse = recon.parse;
var base64 = recon.base64;
var attr = recon.attr;
var slot = recon.slot;
var absent = recon.absent;
var empty = recon.empty;

function assertEqual(x, y) {
  if (!recon.compare(x, y))
    assert.fail(false, true, recon.stringify(x) +' did not equal '+ recon.stringify(y));
}

describe('Recon parser', function () {
  it('should parse empty input', function () {
    assertEqual(parse(''), absent);
  });

  it('should parse empty records', function () {
    assertEqual(parse('{}'), empty());
  });

  it('should parse empty markup', function () {
    assertEqual(parse('[]'), '');
  });

  it('should parse empty strings', function () {
    assertEqual(parse('""'), '');
  });

  it('should parse non-empty strings', function () {
    assertEqual(parse('"test"'), 'test');
  });

  it('should parse strings with escapes', function () {
    assertEqual(parse('"\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t"'), '"\\/@{}[]\b\f\n\r\t');
  });

  it('should parse empty data', function () {
    assertEqual(parse('%'), base64());
  });

  it('should parse non-empty data', function () {
    assertEqual(parse('%AAAA'), base64('AAAA'));
    assertEqual(parse('%AAA='), base64('AAA='));
    assertEqual(parse('%AA=='), base64('AA=='));
    assertEqual(parse('%ABCDabcd12/+'), base64('ABCDabcd12/+'));
  });

  it('should parse positive integers', function () {
    assertEqual(parse('0'), 0);
    assertEqual(parse('1'), 1);
    assertEqual(parse('5'), 5);
    assertEqual(parse('10'), 10);
    assertEqual(parse('11'), 11);
    assertEqual(parse('15'), 15);
  });

  it('should parse negative integers', function () {
    assertEqual(parse('-0'), -0);
    assertEqual(parse('-1'), -1);
    assertEqual(parse('-5'), -5);
    assertEqual(parse('-10'), -10);
    assertEqual(parse('-11'), -11);
    assertEqual(parse('-15'), -15);
  });

  it('should parse positive decimals', function () {
    assertEqual(parse('0.0'), 0.0);
    assertEqual(parse('0.5'), 0.5);
    assertEqual(parse('1.0'), 1.0);
    assertEqual(parse('1.5'), 1.5);
    assertEqual(parse('10.0'), 10.0);
    assertEqual(parse('10.5'), 10.5);
  });

  it('should parse negative decimals', function () {
    assertEqual(parse('-0.0'), -0.0);
    assertEqual(parse('-0.5'), -0.5);
    assertEqual(parse('-1.0'), -1.0);
    assertEqual(parse('-1.5'), -1.5);
    assertEqual(parse('-10.0'), -10.0);
    assertEqual(parse('-10.5'), -10.5);
  });

  it('should parse positive decimals with exponents', function () {
    assertEqual(parse('4e2'), 4e2);
    assertEqual(parse('4E2'), 4E2);
    assertEqual(parse('4e+2'), 4e+2);
    assertEqual(parse('4E+2'), 4E+2);
    assertEqual(parse('4e-2'), 4e-2);
    assertEqual(parse('4E-2'), 4E-2);
    assertEqual(parse('4.0e2'), 4.0e2);
    assertEqual(parse('4.0E2'), 4.0E2);
    assertEqual(parse('4.0e+2'), 4.0e+2);
    assertEqual(parse('4.0E+2'), 4.0E+2);
    assertEqual(parse('4.0e-2'), 4.0e-2);
    assertEqual(parse('4.0E-2'), 4.0E-2);
  });

  it('should parse negative decimals with exponents', function () {
    assertEqual(parse('-4e2'), -4e2);
    assertEqual(parse('-4E2'), -4E2);
    assertEqual(parse('-4e+2'), -4e+2);
    assertEqual(parse('-4E+2'), -4E+2);
    assertEqual(parse('-4e-2'), -4e-2);
    assertEqual(parse('-4E-2'), -4E-2);
    assertEqual(parse('-4.0e2'), -4.0e2);
    assertEqual(parse('-4.0E2'), -4.0E2);
    assertEqual(parse('-4.0e+2'), -4.0e+2);
    assertEqual(parse('-4.0E+2'), -4.0E+2);
    assertEqual(parse('-4.0e-2'), -4.0e-2);
    assertEqual(parse('-4.0E-2'), -4.0E-2);
  });

  it('should parse booleans', function () {
    assertEqual(parse('true'), true);
    assertEqual(parse('false'), false);
  });

  it('should parse single values with trailing commas', function () {
    assertEqual(parse('1,'), 1);
  });

  it('should parse single values with trailing semicolons', function () {
    assertEqual(parse('1;'), 1);
  });

  it('should parse multiple comma separated items', function () {
    assertEqual(parse('  1, 2,3 ,4  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1, 2,3 ,4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple semicolon separated items', function () {
    assertEqual(parse('  1; 2;3 ;4  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1; 2;3 ;4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with trailing commas', function () {
    assertEqual(parse('  1, 2,3 ,4,  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1, 2,3 ,4, }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with trailing semicolons', function () {
    assertEqual(parse('  1, 2,3 ,4;  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1, 2,3 ,4; }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple newline separated items', function () {
    assertEqual(parse('  1\n 2\n3 \n4  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1\n 2\n3 \n4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple items with mixed separators', function () {
    assertEqual(parse('  1, 2\n3 \n4; 5  '), recon(1, 2, 3, 4, 5));
    assertEqual(parse('{ 1, 2\n3 \n4; 5 }'), recon(1, 2, 3, 4, 5));
  });

  it('should parse multiple comma-newline separated items', function () {
    assertEqual(parse('  1,\n 2,\n3 ,\n4  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1,\n 2,\n3 ,\n4 }'), recon(1, 2, 3, 4));
  });

  it('should parse multiple semicolon-newline separated items', function () {
    assertEqual(parse('  1;\n 2;\n3 ;\n4  '), recon(1, 2, 3, 4));
    assertEqual(parse('{ 1;\n 2;\n3 ;\n4 }'), recon(1, 2, 3, 4));
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
      slot('markup', ''),
      '',
      base64('AA=='),
      slot('integer', 0),
      slot('decimal', 0.0),
      true,
      false
    );
    assertEqual(parse(string), record);
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
      slot('markup', ''),
      '',
      base64('AA=='),
      slot('integer', 0),
      slot('decimal', 0.0),
      true,
      false
    );
    assertEqual(parse(string), record);
  });

  it('should parse single extant attributes with no parameters', function () {
    assertEqual(parse('@test'), recon(attr('test')));
  });

  it('should parse single extant attributes with empty parameters', function () {
    assertEqual(parse('@test()'), recon(attr('test')));
  });

  it('should parse single extant attributes with single parameters', function () {
    assertEqual(parse('@hello({})'), recon(attr('hello', empty())));
    assertEqual(parse('@hello([world])'), recon(attr('hello', 'world')));
    assertEqual(parse('@hello("world")'), recon(attr('hello', 'world')));
    assertEqual(parse('@hello(42)'), recon(attr('hello', 42)));
    assertEqual(parse('@hello(true)'), recon(attr('hello', true)));
    assertEqual(parse('@hello(false)'), recon(attr('hello', false)));
  });

  it('should parse single extant attributes with multiple parameters', function () {
    var record = recon(attr('hello', recon('world', base64('AA=='), 42, true)));
    assertEqual(parse('@hello("world", %AA==, 42, true)'), record);
    assertEqual(parse('@hello("world"; %AA==; 42; true)'), record);
    assertEqual(parse('@hello("world"\n%AA==\n42\ntrue)'), record);
  });

  it('should parse single extant attributes with named parameters', function () {
    assertEqual(parse('@hello(name: "world")'), recon(attr('hello', recon(slot('name', 'world')))));
    assertEqual(parse('@hello(name: "world", data: %AA==, number: 42, false)'), recon(
      attr('hello', recon(slot('name', 'world'), slot('data', base64('AA==')), slot('number', 42), false))));
  });

  it('should parse multiple extant attributes with no parameters', function () {
    assertEqual(parse('@a @b'), recon(attr('a'), attr('b')));
  });

  it('should parse multiple extant attributes with empty parameters', function () {
    assertEqual(parse('@a() @b()'), recon(attr('a'), attr('b')));
  });

  it('should parse multiple extant attributes with single parameters', function () {
    assertEqual(parse('@a({}) @b([])'), recon(attr('a', empty()), attr('b', '')));
    assertEqual(parse('@a("test") @b(42)'), recon(attr('a', 'test'), attr('b', 42)));
    assertEqual(parse('@a(true) @b(false)'), recon(attr('a', true), attr('b', false)));
  });

  it('should parse multiple extant attributes with complex parameters', function () {
    assertEqual(parse('@hello("world", 42) @test(name: "parse", pending: false)'), recon(
      attr('hello', recon('world', 42)),
      attr('test', recon(slot('name', 'parse'), slot('pending', false)))));
  });

  it('should parse attributed empty records', function () {
    assertEqual(parse('@hello {}'), recon(attr('hello')));
    assertEqual(parse('@hello() {}'), recon(attr('hello')));
    assertEqual(parse('@hello("world") {}'), recon(attr('hello', 'world')));
    assertEqual(parse('@hello(name: "world") {}'), recon(attr('hello', recon(slot('name', 'world')))));
  });

  it('should parse attributed non-empty records', function () {
    assertEqual(parse('@hello { {}, [] }'), recon(attr('hello'), empty(), ''));
    assertEqual(parse('@hello() { "world", 42 }'), recon(attr('hello'), 'world', 42));
    assertEqual(parse('@hello(name: "world") { number: 42, true }'), recon(
      attr('hello', recon(slot('name', 'world'))), slot('number', 42), true));
  });

  it('should parse attributed empty markup', function () {
    assertEqual(parse('@hello []'), recon(attr('hello')));
    assertEqual(parse('@hello() []'), recon(attr('hello')));
    assertEqual(parse('@hello("world") []'), recon(attr('hello', 'world')));
    assertEqual(parse('@hello(name: "world") []'), recon(attr('hello', recon(slot('name', 'world')))));
  });

  it('should parse attributed empty strings', function () {
    assertEqual(parse('@hello ""'), recon(attr('hello'), ''));
    assertEqual(parse('@hello() ""'), recon(attr('hello'), ''));
    assertEqual(parse('@hello("world") ""'), recon(attr('hello', 'world'), ''));
    assertEqual(parse('@hello(name: "world") ""'), recon(attr('hello', recon(slot('name', 'world'))), ''));
  });

  it('should parse attributed non-empty strings', function () {
    assertEqual(parse('@hello "test"'), recon(attr('hello'), 'test'));
    assertEqual(parse('@hello() "test"'), recon(attr('hello'), 'test'));
    assertEqual(parse('@hello("world") "test"'), recon(attr('hello', 'world'), 'test'));
    assertEqual(parse('@hello(name: "world") "test"'), recon(attr('hello', recon(slot('name', 'world'))), 'test'));
  });

  it('should parse attributed empty data', function () {
    assertEqual(parse('@hello %'), recon(attr('hello'), base64()));
    assertEqual(parse('@hello() %'), recon(attr('hello'), base64()));
    assertEqual(parse('@hello("world") %'), recon(attr('hello', 'world'), base64()));
    assertEqual(parse('@hello(name: "world") %'), recon(attr('hello', recon(slot('name', 'world'))), base64()));
  });

  it('should parse attributed non-empty data', function () {
    assertEqual(parse('@hello %AA=='), recon(attr('hello'), base64('AA==')));
    assertEqual(parse('@hello() %AAA='), recon(attr('hello'), base64('AAA=')));
    assertEqual(parse('@hello("world") %AAAA'), recon(attr('hello', 'world'), base64('AAAA')));
    assertEqual(parse('@hello(name: "world") %ABCDabcd12+/'), recon(
      attr('hello', recon(slot('name', 'world'))), base64('ABCDabcd12+/')));
  });

  it('should parse attributed numbers', function () {
    assertEqual(parse('@hello 42'), recon(attr('hello'), 42));
    assertEqual(parse('@hello() -42'), recon(attr('hello'), -42));
    assertEqual(parse('@hello("world") 42.0'), recon(attr('hello', 'world'), 42.0));
    assertEqual(parse('@hello(name: "world") -42.0'), recon(attr('hello', recon(slot('name', 'world'))), -42.0));
  });

  it('should parse attributed booleans', function () {
    assertEqual(parse('@hello true'), recon(attr('hello'), true));
    assertEqual(parse('@hello() false'), recon(attr('hello'), false));
    assertEqual(parse('@hello("world") true'), recon(attr('hello', 'world'), true));
    assertEqual(parse('@hello(name: "world") false'), recon(attr('hello', recon(slot('name', 'world'))), false));
  });

  it('should parse plain markup as text', function () {
    assertEqual(parse('[test]'), 'test');
  });

  it('should parse plain markup with escapes', function () {
    assertEqual(parse('[\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t]'), '"\\/@{}[]\b\f\n\r\t');
  });

  it('should parse markup with embedded markup', function () {
    assertEqual(parse('[Hello, [good] world!]'), recon('Hello, ', 'good', ' world!'));
  });

  it('should parse markup with embedded structure', function () {
    assertEqual(parse('[Hello{}world]'), recon('Hello', 'world'));
    assertEqual(parse('[A: {"answer"}.]'), recon('A: ', 'answer', '.'));
    assertEqual(parse('[A: {%AA==}.]'), recon('A: ', base64('AA=='), '.'));
    assertEqual(parse('[A: {42}.]'), recon('A: ', 42, '.'));
    assertEqual(parse('[A: {true}.]'), recon('A: ', true, '.'));
    assertEqual(parse('[A: {false}.]'), recon('A: ', false, '.'));
    assertEqual(parse('[A: {answer:0.0}.]'), recon('A: ', slot('answer', 0.0), '.'));
  });

  it('should parse markup with embedded attributes', function () {
    assertEqual(parse('[A: @answer.]'), recon('A: ', recon(attr('answer')), '.'));
    assertEqual(parse('[A: @answer().]'), recon('A: ', recon(attr('answer')), '.'));
    assertEqual(parse('[A: @answer("secret").]'), recon('A: ', recon(attr('answer', 'secret')), '.'));
    assertEqual(parse('[A: @answer(number: 42, true).]'), recon(
      'A: ', recon(attr('answer', recon(slot('number', 42), true))), '.'));
  });

  it('should parse markup with embedded attributed markup', function () {
    assertEqual(parse('[Hello, @em[world]!]'), recon('Hello, ', recon(attr('em'), 'world'), '!'));
    assertEqual(parse('[Hello, @em() [world]!]'), recon('Hello, ', recon(attr('em'), 'world'), '!'));
    assertEqual(parse('[Hello, @em("italic")[world]!]'), recon(
      'Hello, ', recon(attr('em', 'italic'), 'world'), '!'));
    assertEqual(parse('[Hello, @em(class:"subject",style:"italic")[world]!]'), recon(
      'Hello, ', recon(attr('em', recon(slot('class', 'subject'), slot('style', 'italic'))), 'world'), '!'));
  });

  it('should parse markup with embedded attributed values', function () {
    assertEqual(parse('[A: @answer{42}.]'), recon('A: ', recon(attr('answer'), 42), '.'));
    assertEqual(parse('[A: @answer() {42}.]'), recon('A: ', recon(attr('answer'), 42), '.'));
    assertEqual(parse('[A: @answer("secret") {42}.]'), recon('A: ', recon(attr('answer', 'secret'), 42), '.'));
    assertEqual(parse('[A: @answer(number: 42, "secret") {true}.]'), recon(
      'A: ', recon(attr('answer', recon(slot('number', 42), 'secret')), true), '.'));
  });
});
