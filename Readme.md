
# graph.ql

  Faster and simpler technique for creating and querying GraphQL schemas. 100% compatible with the current GraphQL Schema spec.

## Features

- 100% compliance with the current GraphQL schema spec
- Support for queries, mutations, and subscriptions
- Input type support
- Variable support

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

With [graphql-js](http://github.com/graphql/graphql-js), it would look like this:

```js
var graphql = require('graphql')

var Film = new graphql.GraphQLObjectType({
  name: 'Film',
  fields: () => ({
    title: {
      type: graphql.GraphQLString
    }
  })
})

var schema = new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'Query'
    fields: () => ({
      film: {
        type: Film,
        args: {
          id: {
            description: 'Fetch the film by id',
            type: graphql.GraphQLInt
          }
        },
        resolve: (root, args) => return load_film(args.id)
      }
    })
  })
})
```

With `graph.ql`, it looks like this:

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
    film (root, args) {
      return load_film(args.id)
    }
  }
})
```

## Working with Variables

After the schema has been created:

```js
schema(`
  query fetch_film($id: Int) {
    film (id: $id) {
      title
    }
  }
`, {
  id: 1
}).then(res => {
  console.log(res.data)
})
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
