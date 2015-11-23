var Create = require('./')

var query = Create(`
  type Person {
    name: String
    age: Int
  }

  type Query {
    person(): Person
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
    person: function () {
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
  query A {
    person {
      name
    }
  }
`, {
  person: {
    name: 'Matt',
    age: 25
  }
}).then(res => console.log(res))

// console.log(out)
