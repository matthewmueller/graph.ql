// Adapted from graphql-js's starWarsData.js

var luke = {
  id: '1000',
  name: 'Luke Skywalker',
  friends: [ '1002', '1003', '2000', '2001' ],
  appearsIn: [ 4, 5, 6 ],
  homePlanet: 'Tatooine',
};

var vader = {
  id: '1001',
  name: 'Darth Vader',
  friends: [ '1004' ],
  appearsIn: [ 4, 5, 6 ],
  homePlanet: 'Tatooine',
};

var han = {
  id: '1002',
  name: 'Han Solo',
  friends: [ '1000', '1003', '2001' ],
  appearsIn: [ 4, 5, 6 ],
};

var leia = {
  id: '1003',
  name: 'Leia Organa',
  friends: [ '1000', '1002', '2000', '2001' ],
  appearsIn: [ 4, 5, 6 ],
  homePlanet: 'Alderaan',
};

var tarkin = {
  id: '1004',
  name: 'Wilhuff Tarkin',
  friends: [ '1001' ],
  appearsIn: [ 4 ],
};

var humanData = {
  1000: luke,
  1001: vader,
  1002: han,
  1003: leia,
  1004: tarkin,
};

var threepio = {
  id: '2000',
  name: 'C-3PO',
  friends: [ '1000', '1002', '1003', '2001' ],
  appearsIn: [ 4, 5, 6 ],
  primaryFunction: 'Protocol',
};

var artoo = {
  id: '2001',
  name: 'R2-D2',
  friends: [ '1000', '1002', '1003' ],
  appearsIn: [ 4, 5, 6 ],
  primaryFunction: 'Astromech',
};

var droidData = {
  2000: threepio,
  2001: artoo,
};

function getCharacter(id) {
  // Returning a promise just to illustrate GraphQL.js's support.
  return Promise.resolve(humanData[id] || droidData[id]);
}
function getFriends(character) {
  return character.friends.map(id => getCharacter(id));
}
function getHero(root, args) {
  if (args.episode === 5) {
    // Luke is the hero of Episode V.
    return luke;
  }
  // Artoo is the hero otherwise.
  return artoo;
}
function getHuman(root, args) {
  return humanData[args.id];
}
function getDroid(root, args) {
  return droidData[args.id];
}

module.exports = {

  Character: {
    resolveType(obj, info) {
      return obj.id[0] === '1' ? info.schema.getType('Human') : info.schema.getType('Droid')
    }
  },

  Episode: {
    NEWHOPE: 4,
    EMPIRE: 5,
    JEDI: 6
  },

  Human: {
    friends: getFriends
  },

  Droid: {
    friends: getFriends
  },

  Query: {
    hero: getHero,
    human: getHuman,
    droid: getDroid
  }

}
