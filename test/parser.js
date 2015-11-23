/**
 * Module Dependencies
 */

var parse = require('../lib/parse')
var join = require('path').join
var assert = require('assert')
var fs = require('fs')

/**
 * Tests
 */

describe('parser', function() {
  it('should work on the kitchen sink', function() {
    var schema = read('schema.graphql')
    var expected = json('schema.json')
    assert.deepEqual(parse(schema), expected)
  })
})

/**
 * Read
 */

function read (path) {
  return fs.readFileSync(join(__dirname, 'fixtures', path), 'utf8')
}

/**
 * JSON
 */

function json (path) {
  return require(join(__dirname, 'fixtures', path))
}
