'use strict';
/* global describe: false */
/* global it: false */

var assert = require('assert');
var recon = require('./recon.js');

function assertEqual(x, y) {
  if (!recon.compare(x, y))
    assert.fail(false, true, recon.stringify(x) +' did not equal '+ recon.stringify(y));
}

describe('Recon parser', function () {
  it('should parse empty input', function () {
    assertEqual(recon.parse(''), recon.Absent);
  });

  it('should parse empty records', function () {
    assertEqual(recon.parse('{}'), recon.Record.empty());
  });

  it('should parse empty markup', function () {
    assertEqual(recon.parse('[]'), '');
  });

  it('should parse empty strings', function () {
    assertEqual(recon.parse('""'), '');
  });

  it('should parse non-empty strings', function () {
    assertEqual(recon.parse('"test"'), 'test');
  });

  it('should parse strings with escapes', function () {
    assertEqual(recon.parse('"\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t"'), '"\\/@{}[]\b\f\n\r\t');
  });

  it('should parse empty data', function () {
    assertEqual(recon.parse('%'), new Uint8Array(0));
  });

  it('should parse non-empty data', function () {
    assertEqual(recon.parse('%AAAA'), new Uint8Array(recon.Data.fromBase64('AAAA')));
    assertEqual(recon.parse('%AAA='), new Uint8Array(recon.Data.fromBase64('AAA=')));
    assertEqual(recon.parse('%AA=='), new Uint8Array(recon.Data.fromBase64('AA==')));
    assertEqual(recon.parse('%ABCDabcd12/+'), new Uint8Array(recon.Data.fromBase64('ABCDabcd12/+')));
  });

  it('should parse positive integers', function () {
    assertEqual(recon.parse('0'), 0);
    assertEqual(recon.parse('1'), 1);
    assertEqual(recon.parse('5'), 5);
    assertEqual(recon.parse('10'), 10);
    assertEqual(recon.parse('11'), 11);
    assertEqual(recon.parse('15'), 15);
  });

  it('should parse negative integers', function () {
    assertEqual(recon.parse('-0'), -0);
    assertEqual(recon.parse('-1'), -1);
    assertEqual(recon.parse('-5'), -5);
    assertEqual(recon.parse('-10'), -10);
    assertEqual(recon.parse('-11'), -11);
    assertEqual(recon.parse('-15'), -15);
  });

  it('should parse positive decimals', function () {
    assertEqual(recon.parse('0.0'), 0.0);
    assertEqual(recon.parse('0.5'), 0.5);
    assertEqual(recon.parse('1.0'), 1.0);
    assertEqual(recon.parse('1.5'), 1.5);
    assertEqual(recon.parse('10.0'), 10.0);
    assertEqual(recon.parse('10.5'), 10.5);
  });

  it('should parse negative decimals', function () {
    assertEqual(recon.parse('-0.0'), -0.0);
    assertEqual(recon.parse('-0.5'), -0.5);
    assertEqual(recon.parse('-1.0'), -1.0);
    assertEqual(recon.parse('-1.5'), -1.5);
    assertEqual(recon.parse('-10.0'), -10.0);
    assertEqual(recon.parse('-10.5'), -10.5);
  });

  it('should parse positive decimals with exponents', function () {
    assertEqual(recon.parse('4e2'), 4e2);
    assertEqual(recon.parse('4E2'), 4E2);
    assertEqual(recon.parse('4e+2'), 4e+2);
    assertEqual(recon.parse('4E+2'), 4E+2);
    assertEqual(recon.parse('4e-2'), 4e-2);
    assertEqual(recon.parse('4E-2'), 4E-2);
    assertEqual(recon.parse('4.0e2'), 4.0e2);
    assertEqual(recon.parse('4.0E2'), 4.0E2);
    assertEqual(recon.parse('4.0e+2'), 4.0e+2);
    assertEqual(recon.parse('4.0E+2'), 4.0E+2);
    assertEqual(recon.parse('4.0e-2'), 4.0e-2);
    assertEqual(recon.parse('4.0E-2'), 4.0E-2);
  });

  it('should parse negative decimals with exponents', function () {
    assertEqual(recon.parse('-4e2'), -4e2);
    assertEqual(recon.parse('-4E2'), -4E2);
    assertEqual(recon.parse('-4e+2'), -4e+2);
    assertEqual(recon.parse('-4E+2'), -4E+2);
    assertEqual(recon.parse('-4e-2'), -4e-2);
    assertEqual(recon.parse('-4E-2'), -4E-2);
    assertEqual(recon.parse('-4.0e2'), -4.0e2);
    assertEqual(recon.parse('-4.0E2'), -4.0E2);
    assertEqual(recon.parse('-4.0e+2'), -4.0e+2);
    assertEqual(recon.parse('-4.0E+2'), -4.0E+2);
    assertEqual(recon.parse('-4.0e-2'), -4.0e-2);
    assertEqual(recon.parse('-4.0E-2'), -4.0E-2);
  });

  it('should parse booleans', function () {
    assertEqual(recon.parse('true'), true);
    assertEqual(recon.parse('false'), false);
  });

  it('should parse single values with trailing commas', function () {
    assertEqual(recon.parse('1,'), 1);
  });

  it('should parse single values with trailing semicolons', function () {
    assertEqual(recon.parse('1;'), 1);
  });

  it('should parse multiple comma separated items', function () {
    assertEqual(recon.parse('  1, 2,3 ,4  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1, 2,3 ,4 }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple semicolon separated items', function () {
    assertEqual(recon.parse('  1; 2;3 ;4  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1; 2;3 ;4 }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple items with trailing commas', function () {
    assertEqual(recon.parse('  1, 2,3 ,4,  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1, 2,3 ,4, }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple items with trailing semicolons', function () {
    assertEqual(recon.parse('  1, 2,3 ,4;  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1, 2,3 ,4; }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple newline separated items', function () {
    assertEqual(recon.parse('  1\n 2\n3 \n4  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1\n 2\n3 \n4 }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple items with mixed separators', function () {
    assertEqual(recon.parse('  1, 2\n3 \n4; 5  '), recon([1, 2, 3, 4, 5]));
    assertEqual(recon.parse('{ 1, 2\n3 \n4; 5 }'), recon([1, 2, 3, 4, 5]));
  });

  it('should parse multiple comma-newline separated items', function () {
    assertEqual(recon.parse('  1,\n 2,\n3 ,\n4  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1,\n 2,\n3 ,\n4 }'), recon([1, 2, 3, 4]));
  });

  it('should parse multiple semicolon-newline separated items', function () {
    assertEqual(recon.parse('  1;\n 2;\n3 ;\n4  '), recon([1, 2, 3, 4]));
    assertEqual(recon.parse('{ 1;\n 2;\n3 ;\n4 }'), recon([1, 2, 3, 4]));
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
    var record = recon.builder()
      .slot('record', recon.Record.empty())
      .slot('markup', '')
      .item('')
      .item(recon.Data.fromBase64('AA=='))
      .slot('integer', 0)
      .slot('decimal', 0.0)
      .item(true)
      .item(false)
      .state();
    assertEqual(recon.parse(string), record);
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
    var record = recon.builder()
      .slot('record', recon.Record.empty())
      .slot('markup', '')
      .item('')
      .item(recon.Data.fromBase64('AA=='))
      .slot('integer', 0)
      .slot('decimal', 0.0)
      .item(true)
      .item(false)
      .state();
    assertEqual(recon.parse(string), record);
  });

  it('should parse single extant attributes with no parameters', function () {
    assertEqual(recon.parse('@test'), recon.builder().attr('test').state());
  });

  it('should parse single extant attributes with empty parameters', function () {
    assertEqual(recon.parse('@test()'), recon.builder().attr('test').state());
  });

  it('should parse single extant attributes with single parameters', function () {
    assertEqual(recon.parse('@hello({})'), recon.builder().attr('hello', recon.Record.empty()).state());
    assertEqual(recon.parse('@hello([world])'), recon.builder().attr('hello', 'world').state());
    assertEqual(recon.parse('@hello("world")'), recon.builder().attr('hello', 'world').state());
    assertEqual(recon.parse('@hello(42)'), recon.builder().attr('hello', 42).state());
    assertEqual(recon.parse('@hello(true)'), recon.builder().attr('hello', true).state());
    assertEqual(recon.parse('@hello(false)'), recon.builder().attr('hello', false).state());
  });

  it('should parse single extant attributes with multiple parameters', function () {
    var record = recon.builder()
      .attr('hello', recon.builder()
        .item('world')
        .item(recon.Data.fromBase64('AA=='))
        .item(42)
        .item(true)
        .state())
      .state();
    assertEqual(recon.parse('@hello("world", %AA==, 42, true)'), record);
    assertEqual(recon.parse('@hello("world"; %AA==; 42; true)'), record);
    assertEqual(recon.parse('@hello("world"\n%AA==\n42\ntrue)'), record);
  });

  it('should parse single extant attributes with named parameters', function () {
    var record1 = recon.builder()
      .attr('hello', recon.builder()
        .slot('name', 'world')
        .state())
      .state();
    assertEqual(recon.parse('@hello(name: "world")'), record1);
    var record2 = recon.builder()
      .attr('hello', recon.builder()
        .slot('name', 'world')
        .slot('data', recon.Data.fromBase64('AA=='))
        .slot('number', 42)
        .item(false)
        .state())
      .state();
    assertEqual(recon.parse('@hello(name: "world", data: %AA==, number: 42, false)'), record2);
  });

  it('should parse multiple extant attributes with no parameters', function () {
    assertEqual(recon.parse('@a @b'), recon.builder().attr('a').attr('b').state());
  });

  it('should parse multiple extant attributes with empty parameters', function () {
    assertEqual(recon.parse('@a() @b()'), recon.builder().attr('a').attr('b').state());
  });

  it('should parse multiple extant attributes with single parameters', function () {
    assertEqual(recon.parse('@a({}) @b([])'),
                recon.builder().attr('a', {}).attr('b', '').state());
    assertEqual(recon.parse('@a("test") @b(42)'),
                recon.builder().attr('a', 'test').attr('b', 42).state());
    assertEqual(recon.parse('@a(true) @b(false)'),
                recon.builder().attr('a', true).attr('b', false).state());
  });

  it('should parse multiple extant attributes with complex parameters', function () {
    var string = '@hello("world", 42) @test(name: "parse", pending: false)';
    var record = recon.builder()
      .attr('hello', recon.builder()
        .item('world')
        .item(42)
        .state())
      .attr('test', recon.builder()
        .slot('name', 'parse')
        .slot('pending', false)
        .state())
      .state();
    assertEqual(recon.parse(string), record);
  });

  it('should parse attributed empty records', function () {
    assertEqual(recon.parse('@hello {}'), recon.builder().attr('hello').state());
    assertEqual(recon.parse('@hello() {}'), recon.builder().attr('hello').state());
    assertEqual(recon.parse('@hello("world") {}'), recon.builder().attr('hello', 'world').state());
    assertEqual(recon.parse('@hello(name: "world") {}'),
                recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).state());
  });

  it('should parse attributed non-empty records', function () {
    assertEqual(recon.parse('@hello { {}, [] }'),
                recon.builder().attr('hello').item({}).item('').state());
    assertEqual(recon.parse('@hello() { "world", 42 }'),
                recon.builder().attr('hello').item('world').item(42).state());
    assertEqual(recon.parse('@hello(name: "world") { number: 42, true }'),
                recon.builder().attr('hello', recon.builder().slot('name', 'world').state())
                               .slot('number', 42).item(true).state());
  });

  it('should parse attributed empty markup', function () {
    assertEqual(recon.parse('@hello []'), recon.builder().attr('hello').state());
    assertEqual(recon.parse('@hello() []'), recon.builder().attr('hello').state());
    assertEqual(recon.parse('@hello("world") []'), recon.builder().attr('hello', 'world').state());
    assertEqual(
      recon.parse('@hello(name: "world") []'),
      recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).state());
  });

  it('should parse attributed empty strings', function () {
    assertEqual(recon.parse('@hello ""'), recon.builder().attr('hello').item('').state());
    assertEqual(recon.parse('@hello() ""'), recon.builder().attr('hello').item('').state());
    assertEqual(
      recon.parse('@hello("world") ""'),
      recon.builder().attr('hello', 'world').item('').state());
    assertEqual(
      recon.parse('@hello(name: "world") ""'),
      recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).item('').state());
  });

  it('should parse attributed non-empty strings', function () {
    assertEqual(recon.parse('@hello "test"'), recon.builder().attr('hello').item('test').state());
    assertEqual(recon.parse('@hello() "test"'), recon.builder().attr('hello').item('test').state());
    assertEqual(
      recon.parse('@hello("world") "test"'),
      recon.builder().attr('hello', 'world').item('test').state());
    assertEqual(
      recon.parse('@hello(name: "world") "test"'),
      recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).item('test').state());
  });

  it('should parse attributed empty data', function () {
    assertEqual(recon.parse('@hello %'), recon.builder().attr('hello').item(recon.Data.empty()).state());
    assertEqual(recon.parse('@hello() %'), recon.builder().attr('hello').item(recon.Data.empty()).state());
    assertEqual(
      recon.parse('@hello("world") %'),
      recon.builder().attr('hello', 'world').item(recon.Data.empty()).state());
    assertEqual(
      recon.parse('@hello(name: "world") %'),
      recon.builder()
        .attr('hello', recon.builder()
          .slot('name', 'world').state())
        .item(recon.Data.empty()).state());
  });

  it('should parse attributed non-empty data', function () {
    assertEqual(
      recon.parse('@hello %AA=='),
      recon.builder().attr('hello').item(recon.Data.fromBase64('AA==')).state());
    assertEqual(
      recon.parse('@hello() %AAA='),
      recon.builder().attr('hello').item(recon.Data.fromBase64('AAA=')).state());
    assertEqual(
      recon.parse('@hello("world") %AAAA'),
      recon.builder().attr('hello', 'world').item(recon.Data.fromBase64('AAAA')).state());
    assertEqual(
      recon.parse('@hello(name: "world") %ABCDabcd12+/'),
      recon.builder()
        .attr('hello', recon.builder()
          .slot('name', 'world').state())
        .item(recon.Data.fromBase64('ABCDabcd12+/')).state());
  });

  it('should parse attributed numbers', function () {
    assertEqual(recon.parse('@hello 42'), recon.builder().attr('hello').item(42).state());
    assertEqual(recon.parse('@hello() -42'), recon.builder().attr('hello').item(-42).state());
    assertEqual(
      recon.parse('@hello("world") 42.0'),
      recon.builder().attr('hello', 'world').item(42.0).state());
    assertEqual(
      recon.parse('@hello(name: "world") -42.0'),
      recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).item(-42.0).state());
  });

  it('should parse attributed booleans', function () {
    assertEqual(recon.parse('@hello true'), recon.builder().attr('hello').item(true).state());
    assertEqual(recon.parse('@hello() false'), recon.builder().attr('hello').item(false).state());
    assertEqual(
      recon.parse('@hello("world") true'),
      recon.builder().attr('hello', 'world').item(true).state());
    assertEqual(
      recon.parse('@hello(name: "world") false'),
      recon.builder().attr('hello', recon.builder().slot('name', 'world').state()).item(false).state());
  });

  it('should parse plain markup as text', function () {
    assertEqual(recon.parse('[test]'), 'test');
  });

  it('should parse plain markup with escapes', function () {
    assertEqual(recon.parse('[\\"\\\\\\/\\@\\{\\}\\[\\]\\b\\f\\n\\r\\t]'), '"\\/@{}[]\b\f\n\r\t');
  });

  it('should parse markup with embedded markup', function () {
    assertEqual(
      recon.parse('[Hello, [good] world!]'),
      recon.builder().item('Hello, ').item('good').item(' world!').state());
  });

  it('should parse markup with embedded structure', function () {
    assertEqual(recon.parse('[Hello{}world]'),
                recon.builder().item('Hello').item('world').state());
    assertEqual(recon.parse('[A: {"answer"}.]'),
                recon.builder().item('A: ').item('answer').item('.').state());
    assertEqual(recon.parse('[A: {%AA==}.]'),
                recon.builder().item('A: ').item(recon.Data.fromBase64('AA==')).item('.').state());
    assertEqual(recon.parse('[A: {42}.]'),
                recon.builder().item('A: ').item(42).item('.').state());
    assertEqual(recon.parse('[A: {true}.]'),
                recon.builder().item('A: ').item(true).item('.').state());
    assertEqual(recon.parse('[A: {false}.]'),
                recon.builder().item('A: ').item(false).item('.').state());
    assertEqual(recon.parse('[A: {answer:0.0}.]'),
                recon.builder().item('A: ').slot('answer', 0.0).item('.').state());
  });

  it('should parse markup with embedded attributes', function () {
    assertEqual(
      recon.parse('[A: @answer.]'),
      recon.builder().item('A: ').item(recon.builder().attr('answer').state()).item('.').state());
    assertEqual(
      recon.parse('[A: @answer().]'),
      recon.builder().item('A: ').item(recon.builder().attr('answer').state()).item('.').state());
    assertEqual(
      recon.parse('[A: @answer("secret").]'),
      recon.builder().item('A: ').item(recon.builder().attr('answer', 'secret').state()).item('.').state());
    assertEqual(
      recon.parse('[A: @answer(number: 42, true).]'),
      recon.builder()
        .item('A: ')
        .item(recon.builder()
          .attr('answer', recon.builder()
            .slot('number', 42)
            .item(true)
            .state())
          .state())
        .item('.')
        .state());
  });

  it('should parse markup with embedded attributed markup', function () {
    assertEqual(
      recon.parse('[Hello, @em[world]!]'),
      recon.builder()
        .item('Hello, ')
        .item(recon.builder()
          .attr('em')
          .item('world')
          .state())
        .item('!')
        .state());
    assertEqual(
      recon.parse('[Hello, @em() [world]!]'),
      recon.builder()
        .item('Hello, ')
        .item(recon.builder()
          .attr('em')
          .item('world')
          .state())
        .item('!')
        .state());
    assertEqual(
      recon.parse('[Hello, @em("italic")[world]!]'),
      recon.builder()
        .item('Hello, ')
        .item(recon.builder()
          .attr('em', 'italic')
          .item('world')
          .state())
        .item('!')
        .state());
    assertEqual(
      recon.parse('[Hello, @em(class:"subject",style:"italic")[world]!]'),
      recon.builder()
        .item('Hello, ')
        .item(recon.builder()
          .attr('em', recon.builder()
            .slot('class', 'subject')
            .slot('style', 'italic')
            .state())
          .item('world')
          .state())
        .item('!')
        .state());
  });

  it('should parse markup with embedded attributed values', function () {
    assertEqual(
      recon.parse('[A: @answer{42}.]'),
      recon.builder()
        .item('A: ')
        .item(recon.builder()
          .attr('answer')
          .item(42)
          .state())
        .item('.')
        .state());
    assertEqual(
      recon.parse('[A: @answer() {42}.]'),
      recon.builder()
        .item('A: ')
        .item(recon.builder()
          .attr('answer')
          .item(42)
          .state())
        .item('.')
        .state());
    assertEqual(
      recon.parse('[A: @answer("secret") {42}.]'),
      recon.builder()
        .item('A: ')
        .item(recon.builder()
          .attr('answer', 'secret')
          .item(42)
          .state())
        .item('.')
        .state());
    assertEqual(
      recon.parse('[A: @answer(number: 42, "secret") {true}.]'),
      recon.builder()
        .item('A: ')
        .item(recon.builder()
          .attr('answer', recon.builder()
            .slot('number', 42)
            .item('secret')
            .state())
          .item(true)
          .state())
        .item('.')
        .state());
  });
});
