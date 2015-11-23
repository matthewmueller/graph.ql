/**
 * Module Dependencies
 */

var graphql = require('graphql')
var parse = require('./parse')

/**
 * Generators
 */

var Schema = require('./generators/schema')
var Type = require('./generators/type')

/**
 * Export `Create`
 */

module.exports = Create

/**
 * Create the query
 */

function Create (schema, implementation) {
  var types = Type(parse(schema), implementation)
  var object_types = types.objectTypes

  var schema = new graphql.GraphQLSchema({
    query: object_types['Query'],
    mutation: object_types['Mutation'],
    subscription: object_types['Subscription']
  });

  return function query (query, params, root_value, operation) {
    return graphql.graphql(schema, query, root_value, params || {}, operation)
  }
}
