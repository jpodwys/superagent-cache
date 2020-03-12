var utils = require('../../utils');
var expect = require('expect');

describe('superagentCache', function() {

    describe('utility tests', function() {
                
        it('arrayToObject should parse query params', function() {
            var test = ['param1[]=foo', 'param1[]=bar', 'param2=baz&param1[]=maybe', 'param3=true', 'param4=hello&param4=world']
            expect(utils.arrayToObj(test)).toEqual({
                "param1[]": ['foo', 'bar', 'maybe'],
                param2: 'baz',
                param3: 'true',
                param4: ['hello', 'world']
            })
        })

        it('stringToObject should parse query params', function() {
            var test = 'http://example.org/params?param1[]=foo&param1[]=bar&param2=baz&param3=hello&param1[]=world'
            expect(utils.stringToObj(test)).toEqual({
                "param1[]": ['foo', 'bar', 'world'],
                param2: 'baz',
                param3: 'hello'
            });
        });

    })
})