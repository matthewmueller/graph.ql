/**
 * Module Dependencies
 */

var debug = require('debug')('graph.ql:parser')

/**
 * Export `Parse`
 */

module.exports = Parse

/**
 * Space Regexp
 */

var rspace = /^[ \f\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/

/**
 * Initialize `Parse`
 *
 * @param {String} schema
 * @param {Object} implementation
 * @return {Function}
 */

function Parse (schema) {
  if (!(this instanceof Parse)) return new Parse(schema)

  this.original = schema
  this.str = schema

  return this.document()
}

/**
 * match
 */

Parse.prototype.match = function(pattern) {
  // skip over whitespace
  this.ignored()

  var str = this.str

  if (typeof pattern === 'string') {
    if (str.substr(0, pattern.length) === pattern) {
      this.str = str.substr(pattern.length);
      return pattern;
    }
  } else {
    var match = pattern.exec(str)
    if (match) {
      this.str = str.substr(match[0].length);
      return match[0];
    }
  }
}

/**
 * Required values
 */

Parse.prototype.required = function (value, name) {
  if (value) {
    return value;
  } else {
    throw this.error('Expected ' + name + ' but got "' + this.str[0] + '"');
  }
}

/**
 * expect
 */

Parse.prototype.expect = function(str) {
  this.required(this.match(str), '"' + str + '"')
};

/**
 * ignored
 */

Parse.prototype.ignored = function() {
  var str = this.str

  while (true) {

    // newline
    if (str[0] === '\n') {
      str = str.substr(1)
      continue
    }

    // comma
    if (str[0] === ',') {
      str = str.substr(1)
      continue
    }

    // other spacing
    var m = rspace.exec(str)
    if (m) {
      str = str.substr(m[0].length)
      continue
    }

    break
  }

  this.str = str
}

/**
 * document
 */

Parse.prototype.document = function() {
  var definitions = this.list(this.type_definition)

  if (this.str.length) {
    throw this.error('invalid definition (must be either a type, interface, union, scalar, input or extend)')
  }

  // document token
  return {
    kind: 'Document',
    definitions: definitions
  }
}

/**
 * list
 */

Parse.prototype.list = function(node_type) {
  var result = []

  while (true) {
    var node = this.comment() || node_type.call(this)
    if (node) result.push(node)
    else break
  }
  return result
};

/**
 * comment
 */

Parse.prototype.comment = function() {
  var c = this.match(/^\#[^\n]*/)
  if (c) {
    return {
      kind: 'Comment',
      value: c
    }
  }
};


/**
 * type_definition
 */

Parse.prototype.type_definition = function() {
  return this.object_type_definition()
    || this.interface_type_definition()
    || this.union_type_definition()
    || this.scalar_type_definition()
    || this.enum_type_definition()
    || this.input_object_type_definition()
    || this.type_extension_definition()
}

/**
 * Object type definition
 *
 * Example: type Developer { ... }
 */

Parse.prototype.object_type_definition = function() {
  if (this.match('type')) {
    var node = { kind: 'ObjectTypeDefinition' }
    node.name = this.required(this.name(), 'name')
    node.interfaces = this.implements() || []
    this.expect('{')
    node.fields = this.list(this.field_definition)
    this.expect('}')
    return node
  }
}

/**
 * field_definition
 */

Parse.prototype.field_definition = function() {
  var node = { kind: 'FieldDefinition' }

  node.name = this.name()
  if (!node.name) return

  node.arguments = this.arguments_definition()
  this.expect(':')
  node.type = this.required(this.type(), 'type')

  return node
}

/**
 * arguments_definition
 */

Parse.prototype.arguments_definition = function() {
  if (!this.match('(')) return null
  var args = this.list(this.input_value_definition)
  this.expect(')')
  return args || []
};

/**
 * Input Value Definition
 */

Parse.prototype.input_value_definition = function() {
  var node = { kind: 'InputValueDefinition' };

  node.name = this.name()
  if (!node.name) return;

  this.expect(':')
  node.type = this.required(this.type(), 'type');
  node.defaultValue = this.default_value() || null;

  return node;
};


/**
 * Interface type definition
 *
 * Example: interface Person { ... }
 */

Parse.prototype.interface_type_definition = function() {
  if (this.match('interface')) {
    var node = { kind: 'InterfaceTypeDefinition' }
    node.name = this.required(this.name(), 'Name')
    this.expect('{')
    node.fields = this.list(this.field_definition)
    this.expect('}')
    return node
  }
}

/**
 * implements
 */

Parse.prototype.implements = function() {
  if (this.match('implements')) {
    return this.list(this.named_type)
  }
};


/**
 * Union type definition
 *
 * Example: union Animal = Cat | Dog
 */

Parse.prototype.union_type_definition = function() {
  if (this.match('union')) {
    var node = { kind: 'UnionTypeDefinition' }
    node.name = this.required(this.name(), 'Name')
    this.expect('=')

    var types = []
    types.push(this.required(this.named_type(), 'NamedType'))
    while (this.match('|')) {
      types.push(this.required(this.named_type(), 'NamedType'))
    }
    node.types = types

    return node
  }
}

/**
 * Scalar type definition
 *
 * Example: scalar Date
 */

Parse.prototype.scalar_type_definition = function() {
  if (this.match('scalar')) {
    var node = { kind: 'ScalarTypeDefinition' }
    node.name = this.required(this.name(), 'Name')
    return node
  }
}

/**
 * Enum Type Definition
 *
 * Example: enum Site { ... }
 */

Parse.prototype.enum_type_definition = function() {
  if (this.match('enum')) {
    var node = { kind: 'EnumTypeDefinition' };
    node.name = this.required(this.name(), 'Name');
    this.expect('{');
    node.values = this.list(this.enum_value_definition);
    this.expect('}');
    return node;
  }
}

/**
 * enum_value_definition
 */

Parse.prototype.enum_value_definition = function() {
  var name = this.name()
  if (name) return { kind: 'EnumValueDefinition', name: name }
};

/**
 * Input Object Type Definition
 *
 * Example: input Film { ... }
 */

Parse.prototype.input_object_type_definition = function() {
  if (this.match('input')) {
    var node = { kind: 'InputObjectTypeDefinition' };
    node.name = this.required(this.name(), 'Name');
    this.expect('{');
    node.fields = this.list(this.input_value_definition);
    this.expect('}');
    return node;
  }
}

/**
 * Extension Type definition
 *
 * Example: extends type Film { ... }
 */

Parse.prototype.type_extension_definition = function() {
  if (this.match('extend')) {
    var node = { kind: 'TypeExtensionDefinition' };
    node.definition = this.required(this.object_type_definition(), 'ObjectTypeDefinition');
    return node;
  }
}

/**
 * name
 */

Parse.prototype.name = function() {
  var name = this.match(/^[_A-Za-z][_0-9A-Za-z]*/)
  if (name) {
    return {
      kind: 'Name',
      value: name
    }
  }
}

/**
 * Named type
 */

Parse.prototype.named_type = function() {
  var name = this.name()
  if (name) {
    return {
      kind: 'NamedType',
      name: name
    }
  }
};

/**
 * list_type
 */

Parse.prototype.list_type = function() {
  if (this.match('[')) {
    var node = {
      kind: 'ListType',
      type: this.required(this.type(), 'Type')
    }
    this.expect(']')
    return node;
  }
};

/**
 * type
 */

Parse.prototype.type = function() {
  var t = this.named_type() || this.list_type()
  if (this.match('!')) {
    return { kind: 'NonNullType', type: t };
  }
  return t
}

/**
 * value
 */

Parse.prototype.value = function() {
  return this.number_value()
    || this.string_value()
    || this.boolean_value()
    || this.enum_value()
    || this.list_value()
    || this.object_value()
}

/**
 * number_value
 */

Parse.prototype.number_value = function() {
  var str = this.match(/^(\-?0|\-?[1-9][0-9]*)(\.[0-9]+)?([Ee](\+|\-)?[0-9]+)?/);
  if (str) {
    return {
      kind: 'NumberValue',
      value: JSON.parse(str)
    }
  }
}

/**
 * string_value
 */

Parse.prototype.string_value = function() {
  var str = this.match(/^\"([^\"\\\n]|\\\\|\\\")*\"/);
  if (str) {
    return {
      kind: 'StringValue',
      value: JSON.parse(str)
    }
  }
}

/**
 * boolean_value
 */

Parse.prototype.boolean_value = function() {
  var TRUE = this.match('true');
  var FALSE = this.match('false');
  if (TRUE || FALSE) {
    return {
      kind: 'BooleanValue',
      value: TRUE ? true : false
    }
  }
};

/**
 * enum_value
 */

Parse.prototype.enum_value = function() {
  var n = this.name();
  if (n) {
    return {
      kind: 'EnumValue',
      name: n
    };
  }
};

/**
 * list_value
 */

Parse.prototype.list_value = function () {
  if (this.match('[')) {
    var node = { kind: 'ListValue' };
    node.values = this.list(this.value);
    this.expect(']');
    return node;
  }
};

/**
 * object_field
 */

Parse.prototype.object_field = function() {
  var n = this.name();
  if (n) {
    this.expect(':')
    return {
      kind: 'ObjectField',
      name: n,
      value: this.required(this.value(), 'Value')
    };
  }
};

/**
 * object_value
 */

Parse.prototype.object_value = function() {
  if (this.match('{')) {
    var node = { kind: 'ObjectValue' }
    node.fields = this.list(this.object_field)
    this.expect('}')
    return node;
  }
};

/**
 * default_value
 */

Parse.prototype.default_value = function() {
  if (this.match('=')) {
    return this.required(this.value(), 'Value')
  }
}

/**
 * Error
 */

Parse.prototype.error = function(msg) {
  var offset = this.original.length - this.str.length
  return new Error(msg + error_location(this.original, offset))
}

/**
 * Generate the error location
 *
 * @param {String} str
 * @param {Number} offset
 * @return {String}
 */

function error_location (str, offset) {
  var lines = []

  var left = offset - 1
  var right = offset
  var chunk

  // before
  chunk = []
  while (str[left] && str[left] !== '\n') {
    chunk.push(str[left])
    left--
  }
  lines[1] = '    ' + chunk.reverse().join('')

  // place caret
  var padding = Array(lines[1].length).join(' ')
  lines[2] = padding + '^'

  // line before
  chunk = []
  left--
  while (str[left] && str[left] !== '\n') {
    chunk.push(str[left])
    left--
  }
  lines[0] = '    ' + chunk.reverse().join('')

  // after
  chunk = []
  while (str[right] && str[right] !== '\n') {
    chunk.push(str[right])
    right++
  }
  lines[1] += chunk.join('')

  // line after
  chunk = []
  right++
  while (str[right] && str[right] !== '\n') {
    chunk.push(str[right])
    right++
  }
  lines[3] = '    ' + chunk.join('')

  return '\n\n' + lines.join('\n') + '\n'
}
