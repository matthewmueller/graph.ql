/**
 * Module Dependencies
 */

var graphql = require('graphql')
var assert = require('assert')
var co = require('co')

/**
 * Export `Generate`
 */

module.exports = Generate

/**
 * Definitions
 */

var InputObjectType = graphql.GraphQLInputObjectType;
var InterfaceType = graphql.GraphQLInterfaceType;
var ScalarType = graphql.GraphQLScalarType;
var ObjectType = graphql.GraphQLObjectType;
var UnionType = graphql.GraphQLUnionType;
var NonNullType = graphql.GraphQLNonNull;
var EnumType = graphql.GraphQLEnumType;
var ListType = graphql.GraphQLList;

/**
 * Built-in Scalars
 */

var builtInScalars = {
  'String': graphql.GraphQLString,
  'Int': graphql.GraphQLInt,
  'Float': graphql.GraphQLFloat,
  'Boolean': graphql.GraphQLBoolean,
  'ID': graphql.GraphQLID
}

/**
 * Generate
 */

function Generate (document, implementations) {
  var description = []
  var unions = []

  var objectTypes = {};
  var interfaceTypes = {};
  var inputTypes = {};
  var unionTypes = {};
  var scalarTypes = {};
  var enumTypes = {};

  /**
   * Start from the top of the document
   */

  document.definitions.forEach(function (node) {
    switch (node.kind) {
      case 'Comment':
        description.push(node.value.substr(1))
        break
      case 'ObjectTypeDefinition':
        objectTypes[node.name.value] = getObjectTypeDefinition(node);
        break;
      case 'InterfaceTypeDefinition':
        interfaceTypes[node.name.value] = getInterfaceTypeDefinition(node);
        break;
      case 'UnionTypeDefinition':
        unions.push(node);
        break;
      case 'ScalarTypeDefinition':
        scalarTypes[node.name.value] = getScalarTypeDefinition(node);
        break;
      case 'EnumTypeDefinition':
        enumTypes[node.name.value] = getEnumTypeDefinition(node);
        break;
      case 'InputObjectTypeDefinition':
        inputTypes[node.name.value] = getInputObjectTypeDefinition(node)
        break;
      default:
        throw new Error('Unexpected node type ' + node.kind);
    }
  })

  // Delay unions until all other types exist, otherwise circular deps will cause problems
  unions.forEach(function (node) {
    unionTypes[node.name.value] = getUnionTypeDefinition(node);
  });

  /**
   * Return the types
   */

  return {
    objectTypes: objectTypes,
    interfaceTypes: interfaceTypes,
    unionTypes: unionTypes,
    scalarTypes: scalarTypes,
    enumTypes: enumTypes
  }

  /**
   * Get a description
   */

  function getDescription() {
    if (description.length === 0) return null;
    var prefix = description.reduce(function (a, b) {
      return Math.min(a, /^\s*/.exec(b)[0].length);
    }, Infinity);
    var result = description.map(function (str) {
      return str.substr(prefix);
    }).join('\n');
    description = [];
    return result;
  }

  /**
   * Get the output type
   */

  function getOutputType(node) {
    if (node.kind === 'NamedType') {
      var t = (
        builtInScalars[node.name.value] ||
        objectTypes[node.name.value] ||
        interfaceTypes[node.name.value] ||
        unionTypes[node.name.value] ||
        scalarTypes[node.name.value] ||
        enumTypes[node.name.value] ||
        inputTypes[node.name.value]
      );
      if (!t) {
        throw new Error(node.name.value + ' is not implemented.');
      }
      return t;
    }
    if (node.kind === 'ListType') {
      return new ListType(getOutputType(node.type));
    }
    if (node.kind === 'NonNullType') {
      return new NonNullType(getOutputType(node.type));
    }
    console.dir(node);
    throw new Error(node.kind + ' is not supported');
  }

  /**
   * Get the input type
   */

  function getInputType(node) {
    if (node.kind === 'NamedType') {
      var t = (
        builtInScalars[node.name.value] ||
        interfaceTypes[node.name.value] ||
        unionTypes[node.name.value] ||
        scalarTypes[node.name.value] ||
        enumTypes[node.name.value] ||
        inputTypes[node.name.value]
      );

      if (!t) {
        throw new Error(node.name.value + ' is not implemented.');
      }
      return t;
    }
    if (node.kind === 'ListType') {
      return new ListType(getOutputType(node.type));
    }
    if (node.kind === 'NonNullType') {
      return new NonNullType(getOutputType(node.type));
    }
    console.dir(node);
    throw new Error(node.kind + ' is not supported');
  }

  /**
   * Get the raw value
   */

  function getRawValue(node) {
    switch (node.kind) {
      case 'NumberValue':
      case 'StringValue':
      case 'BooleanValue':
        return node.value;
      case 'EnumValue':
        return node.name.value;
      case 'ListValue':
        return node.values.map(getRawValue);
      case 'ObjectValue':
        var res = {};
        node.fields.forEach(function (field) {
          res[field.name.value] = getRawValue(field.value);
        });
        return res;
      default:
        console.dir(node);
        throw new Error(node.kind + ' is not supported');
    }
  }

  /**
   * Get the raw value from the official schema
   */

  function getRawValueFromOfficialSchema(node) {
    switch (node.kind) {
      case 'IntValue':
      case 'FloatValue':
        return JSON.parse(node.value);
      case 'StringValue':
      case 'BooleanValue':
      case 'EnumValue':
        return node.value;
      case 'ListValue':
        return node.values.map(getRawValueFromOfficialSchema);
      case 'ObjectValue':
        var res = {};
        node.fields.forEach(function (field) {
          res[field.name.value] = getRawValueFromOfficialSchema(field.value);
        });
        return res;
      default:
        console.dir(node);
        throw new Error(node.kind + ' is not supported');
    }
  }

  /**
   * Get the interface
   */

  function getInterface(node) {
    assert(node.kind === 'NamedType');
    var t = interfaceTypes[node.name.value];
    if (!t) {
      throw new Error(node.name.value + ' is not defined.');
    }
    return t;
  }

  /**
   * Get the field definitions
   */

  function getFieldDefinitions(node, isInterface) {
    var typeName = node.name.value;
    var fields = {};
    node.fields.forEach(function (field) {
      switch(field.kind) {
        case 'Comment':
          description.push(field.value.substr(1));
          break;
        case 'FieldDefinition':
          if (
            !isInterface &&
            field.arguments &&
            !(implementations[typeName] && implementations[typeName][field.name.value])) {
            throw new Error(typeName + '.' + field.name.value + ' is calculated (i.e. it ' +
                            'accepts arguments) but does not have an implementation');
          }
          var args = undefined;
          if (field.arguments && field.arguments.length) {
            args = {};
            field.arguments.forEach(function (arg) {
              if (arg.kind === 'Comment') return;
              args[arg.name.value] = {
                type: getInputType(arg.type),
                defaultValue: arg.defaultValue ? getRawValue(arg.defaultValue) : undefined
              };
            });
          }
          fields[field.name.value] = {
            name: field.name.value,
            type: getOutputType(field.type),
            description: getDescription(),
            args: args,
            resolve: !isInterface && implementations[typeName] && implementations[typeName][field.name.value]
              ? wrap(implementations[typeName][field.name.value])
              : undefined
          };

          break;
        default:
          throw new Error('Unexpected node type ' + field.kind);
      }
    });
    return fields;
  }

  function wrap (fn) {
    return function () {
      return co.wrap(fn).apply(this, arguments)
    }
  }

  /**
   * Get the object type definition
   */

  function getObjectTypeDefinition(node) {
    var typeName = node.name.value;
    return new ObjectType({
      name: typeName,
      description: getDescription(),
      // TODO: interfaces
      interfaces: node.interfaces
        ? () => node.interfaces.map(getInterface)
        : null,
      fields: function () {
        return getFieldDefinitions(node, false);
      }
    });
  }

  /**
   * Get the interface type definition
   */

  function getInterfaceTypeDefinition(node) {
    return new InterfaceType({
      name: node.name.value,
      description: getDescription(),
      resolveType: makeResolveType(node.name.value),
      fields: function () {
        return getFieldDefinitions(node, true);
      }
    });
  }

  /**
   * Get the union type definition
   */

  function getUnionTypeDefinition(node) {
    return new UnionType({
      name: node.name.value,
      description: getDescription(),
      types: node.types.map(getOutputType),
      resolveType: makeResolveType(node.name.value)
    });
  }

  /**
   * Make type resolver, allowing typeName strings to be returned.
   */
  function makeResolveType(nodeValue) {
    if (!implementations[nodeValue] || !implementations[nodeValue]['resolveType']) return;
    var resolver = implementations[nodeValue]['resolveType'];
    return function typeResolver(value, context, info) {
      var resolved = resolver(value, context, info)
      return typeof resolved === 'string' ? objectTypes[resolved] : resolved
    }
  }

  /**
   * Get the scalar type definition
   */

  function getScalarTypeDefinition(node) {
    var imp = implementations[node.name.value];
    return new ScalarType({
      name: node.name.value,
      description: getDescription(),
      serialize: imp && imp.serialize,
      parseValue: imp && (imp.parseValue || imp.parse),
      parseLiteral: imp && imp.parseLiteral
        ? imp.parseLiteral
        : imp && (imp.parseValue || imp.parse)
        ? (ast) => (imp.parseValue || imp.parse)(getRawValueFromOfficialSchema(ast))
        : undefined,
    });
  }

  /**
   * Get the enum type definition
   */

  function getEnumTypeDefinition(node){
    var d = getDescription();
    var values = {};
    node.values.forEach(function (value) {
      switch (value.kind) {
        case 'Comment':
          description.push(value.value.substr(1));
          break;
        case 'EnumValueDefinition':
          values[value.name.value] = {
            description: getDescription(),
            value: implementations[node.name.value] && implementations[node.name.value][value.name.value]
            // deprecationReason?: string;
          };
          break;
        default:
          throw new Error('Unexpected node type ' + value.kind);
      }
    });
    return new EnumType({
      name: node.name.value,
      description: d,
      values: values
    });
  }

  function getInputObjectTypeDefinition(node) {
    var d = getDescription()
    var fields = {}

    node.fields.forEach(function (field) {
      switch (field.kind) {
        case 'Comment':
          description.push(field.value.substr(1))
          break
        case 'InputValueDefinition':
          fields[field.name.value] = {
            name: field.name,
            description: getDescription(),
            type: getInputType(field.type),
            defaultValue: field.defaultValue ? getRawValue(field.defaultValue) : undefined
          }
          break;
        default:
          throw new Error('Unexpected node type ' + field.kind)
      }
    })

    return new InputObjectType({
      name: node.name.value,
      description: d,
      fields: fields
    })
  }
}
