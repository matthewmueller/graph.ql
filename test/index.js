/**
 * Module Dependencies
 */
var parse = require('../lib/parse')
var join = require('path').join
var assert = require('assert')
var fs = require('fs')
var implementation = require('./implementation')
var Schema = require('../lib')

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
 * Implementation tests
 */

var gql = Schema(read('star-wars.graphql'), implementation)

describe('Star Wars Query Tests', () => {

  describe('Basic Queries', () => {

    it('Correctly identifies R2-D2 as the hero of the Star Wars Saga', () => {
      const query = `
        query HeroNameQuery {
          hero {
            name
          }
        }
      `;
      const expected = {
        hero: {
          name: 'R2-D2'
        }
      };
      return gql.query(query).then(result => assert.deepEqual(result, { data: expected }))
    });

    it('Allows us to query for the ID and friends of R2-D2', () => {
      const query = `
        query HeroNameAndFriendsQuery {
          hero {
            id
            name
            friends {
              name
            }
          }
        }
      `;
      const expected = {
        hero: {
          id: '2001',
          name: 'R2-D2',
          friends: [
            {
              name: 'Luke Skywalker',
            },
            {
              name: 'Han Solo',
            },
            {
              name: 'Leia Organa',
            },
          ]
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });

  describe('Nested Queries', () => {
    it('Allows us to query for the friends of friends of R2-D2', () => {
      const query = `
        query NestedQuery {
          hero {
            name
            friends {
              name
              appearsIn
              friends {
                name
              }
            }
          }
        }
      `;
      const expected = {
        hero: {
          name: 'R2-D2',
          friends: [
            {
              name: 'Luke Skywalker',
              appearsIn: [ 'NEWHOPE', 'EMPIRE', 'JEDI' ],
              friends: [
                {
                  name: 'Han Solo',
                },
                {
                  name: 'Leia Organa',
                },
                {
                  name: 'C-3PO',
                },
                {
                  name: 'R2-D2',
                },
              ]
            },
            {
              name: 'Han Solo',
              appearsIn: [ 'NEWHOPE', 'EMPIRE', 'JEDI' ],
              friends: [
                {
                  name: 'Luke Skywalker',
                },
                {
                  name: 'Leia Organa',
                },
                {
                  name: 'R2-D2',
                },
              ]
            },
            {
              name: 'Leia Organa',
              appearsIn: [ 'NEWHOPE', 'EMPIRE', 'JEDI' ],
              friends: [
                {
                  name: 'Luke Skywalker',
                },
                {
                  name: 'Han Solo',
                },
                {
                  name: 'C-3PO',
                },
                {
                  name: 'R2-D2',
                },
              ]
            },
          ]
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });

  describe('Using IDs and query parameters to refetch objects', () => {
    it('Allows us to query for Luke Skywalker directly, using his ID', () => {
      const query = `
        query FetchLukeQuery {
          human(id: "1000") {
            name
          }
        }
      `;
      const expected = {
        human: {
          name: 'Luke Skywalker'
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to create a generic query, then use it to fetch Luke Skywalker using his ID', () => {
      const query = `
        query FetchSomeIDQuery($someId: String!) {
          human(id: $someId) {
            name
          }
        }
      `;
      const params = {
        someId: '1000'
      };
      const expected = {
        human: {
          name: 'Luke Skywalker'
        }
      };
      return gql.query(query, params).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to create a generic query, then use it to fetch Han Solo using his ID', () => {
      const query = `
        query FetchSomeIDQuery($someId: String!) {
          human(id: $someId) {
            name
          }
        }
      `;
      const params = {
        someId: '1002'
      };
      const expected = {
        human: {
          name: 'Han Solo'
        }
      };
      return gql.query(query, params).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to create a generic query, then pass an invalid ID to get null back', () => {
      const query = `
        query humanQuery($id: String!) {
          human(id: $id) {
            name
          }
        }
      `;
      const params = {
        id: 'not a valid id'
      };
      const expected = {
        human: null
      };
      return gql.query(query, params).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });

  describe('Using aliases to change the key in the response', () => {
    it('Allows us to query for Luke, changing his key with an alias', () => {
      const query = `
        query FetchLukeAliased {
          luke: human(id: "1000") {
            name
          }
        }
      `;
      const expected = {
        luke: {
          name: 'Luke Skywalker'
        },
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to query for both Luke and Leia, using two root fields and an alias', () => {
      const query = `
        query FetchLukeAndLeiaAliased {
          luke: human(id: "1000") {
            name
          }
          leia: human(id: "1003") {
            name
          }
        }
      `;
      const expected = {
        luke: {
          name: 'Luke Skywalker'
        },
        leia: {
          name: 'Leia Organa'
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });

  describe('Uses fragments to express more complex queries', () => {
    it('Allows us to query using duplicated content', () => {
      const query = `
        query DuplicateFields {
          luke: human(id: "1000") {
            name
            homePlanet
          }
          leia: human(id: "1003") {
            name
            homePlanet
          }
        }
      `;
      const expected = {
        luke: {
          name: 'Luke Skywalker',
          homePlanet: 'Tatooine'
        },
        leia: {
          name: 'Leia Organa',
          homePlanet: 'Alderaan'
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to use a fragment to avoid duplicating content', () => {
      const query = `
        query UseFragment {
          luke: human(id: "1000") {
            ...HumanFragment
          }
          leia: human(id: "1003") {
            ...HumanFragment
          }
        }
        fragment HumanFragment on Human {
          name
          homePlanet
        }
      `;
      const expected = {
        luke: {
          name: 'Luke Skywalker',
          homePlanet: 'Tatooine'
        },
        leia: {
          name: 'Leia Organa',
          homePlanet: 'Alderaan'
        }
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });

  describe('Using __typename to find the type of an object', () => {
    it('Allows us to verify that R2-D2 is a droid', () => {
      const query = `
        query CheckTypeOfR2 {
          hero {
            __typename
            name
          }
        }
      `;
      const expected = {
        hero: {
          __typename: 'Droid',
          name: 'R2-D2'
        },
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });

    it('Allows us to verify that Luke is a human', () => {
      const query = `
        query CheckTypeOfLuke {
          hero(episode: EMPIRE) {
            __typename
            name
          }
        }
      `;
      const expected = {
        hero: {
          __typename: 'Human',
          name: 'Luke Skywalker'
        },
      };
      return gql.query(query).then(result => {
        assert.deepEqual(result, { data: expected });
      })
    });
  });
});

/**
 * Full schema test
 */

describe('Using query() syntax', () => {

  it('should support query(...)', () => {

    var query = Schema(`
      type Person {
        name: String
        age: Int
      }

      type Query {
        person(names: [String]): Person
      }

      input PersonInput {
        name: String
        age: Int!
      }

      type Mutation {
        update_person(person: PersonInput): Person
      }
    `, {
      Query: {
        person: function (root, args) {
          return {
            name: 'Matt'
          }
        }
      },
      Mutation: {
        update_person: function (m, args) {
          return {
            name: args.person.name,
            age: args.person.age
          }
        }
      }
    })

    return query(`
      query Q($names: [String]) {
        person(names: $names) {
          name
        }
      }
    `, {
      names: ['Matt', 'Max'],
    }).then(res => {
      assert.deepEqual(res, {
        "data": {
          "person": {
            "name": "Matt"
          }
        }
      })
    })

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
