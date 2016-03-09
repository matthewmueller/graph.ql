/**
 * Module Dependencies
 */

var graphql = require('graphql')
var parse = require('./parse')

/**
 * Generators
 */
var Type = require('./generate')

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

  var logged;

  function query(query, params, root_value, operation) {
    if (!logged) {
      console.log('graph.ql - deprecated: schema(...), use schema.query(...) instead.')
      logged = true
    }
    return query.query(query, params, root_value, operation)
  }

  query.query = function(query, params, root_value, operation) {
    return graphql.graphql(schema, query, root_value, params || {}, operation)
  }
  query.schema = schema

  return query
}
