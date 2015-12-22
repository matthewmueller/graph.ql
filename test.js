var Create = require('./')

var query = Create(`
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
      console.log(args)
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

var out = query(`
  query Q($names: [String]) {
    person(names: $names) {
      name
    }
  }
`, {
  names: ['Matt', 'Max'],
}).then(res => console.log(res))

// console.log(out)
