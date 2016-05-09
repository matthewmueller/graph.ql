![img](https://cldup.com/kYlweU0pwy.png)

# graph.ql

  Faster and simpler technique for creating and querying GraphQL schemas. 100% compatible with the current GraphQL Schema spec.

## Video Course

  If you're interested in diving deeper into GraphQL, I've created a video course called [Building Better APIs with GraphQL](https://www.udemy.com/building-better-apis-with-graphql/?couponCode=RIPREST).

## Features

- 100% compliance with the current GraphQL schema spec
- Support for queries, mutations, and subscriptions
- Input type support
- Variable support

## Installation

```
npm install graph.ql
```

## Example

```js
var Schema = require('graph.ql')

// an object of promises that fetch actual data
var loaders = require('./loaders')

// create the schema
var schema = Schema(`
  scalar Date

  type Person {
    name: String
    films: [Film]
  }

  type Film {
    title: String,
    producers(): [String]
    characters(limit: Int): [Person]
    release_date: Date
  }

  type Query {
    film(id: Int): Film
    person(id: Int): Person
  }
`, {
  Date: {
    serialize(date) {
      return new Date(date)
    }
  },
  Person: {
    films(person) {
      return loaders.film.loadMany(person.films)
    }
  },
  Film: {
    producers(film) {
      return film.producer.split(',')
    },
    characters(film, args) {
      var characters = args.limit
        ? film.characters.slice(0, args.limit)
        : film.characters

      return loaders.person.loadMany(characters)
    }
  },
  Query: {
    film(query, args) {
      return loaders.film.load(args.id)
    },
    person(query, args) {
      return loaders.person.load(args.id)
    }
  },
})

// use the schema
schema(`
  query fetch_film($id: Int) {
    film(id: $id) {
      title
      producers
      release_date
      characters {
        name
        films {
          title
        }
      }
    }
  }
`, {
  id: 1
}).then(res => console.log(res.data))
```

## graphql-js vs graph.ql

Say we want to create a GraphQL schema that looks like this:

```
type Film {
  title: String
}

type Query {
  film(id: Int): Film
}
```

With the official [graphql-js](http://github.com/graphql/graphql-js) library, it would look like this:

```js
var graphql = require('graphql')

var Film = new graphql.GraphQLObjectType({
  name: 'Film',
  fields: {
    title: {
      type: graphql.GraphQLString
    }
  }
})

var schema = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'Query'
    fields: {
      film: {
        type: Film,
        args: {
          id: {
            description: 'Fetch the film by id',
            type: graphql.GraphQLInt
          }
        },
        resolve: (root, args) => load_film(args.id)
      }
    }
  })
})
```

With `graph.ql`, we just need to do this:

```js
var schema = Schema(`
  type Film {
    title: String
  }

  type Query {
    # Fetch the film by id
    film(id: Int): Film
  }
`, {
  Query: {
    film(root, args) {
      return load_film(args.id)
    }
  }
})
```

## FAQ

### How do I add descriptions?

- You can add descriptions by placing a comment directly above the field or type. The following shows a comment on a type as well as a comment on a field.

```js
# Query methods
type Query {
  # Fetch the film by id
  film (id: Int): Film
}
```

## Credits

Thanks to [ForbesLindesay](https://github.com/ForbesLindesay) for his initial work on [graphql-schema-gen](https://github.com/ForbesLindesay/graphql-schema-gen) which laid the groundwork for this module.

Thanks to the GraphQL team for an incredible spec as well as their [kitchen sink](https://github.com/graphql/graphql-js/tree/master/src/language/__tests__) documents to quickly test against the entire spec.

## Run Tests

```
npm install
```

## License

MIT
