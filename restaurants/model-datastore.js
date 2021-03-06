'use strict';

const Datastore = require('@google-cloud/datastore');
const config = require('../config');

// Config
const ds = Datastore({
  //projectId: config.get('cloudcomputingserver1')
  projectId: config.get('GCLOUD_PROJECT')
});
//const kind = 'Restaurants';
const kind = 'Restaurant';
const kind2 = 'Users';

// Translates from Datastore's entity format to app format
function fromDatastore (obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  const results = [];
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) {
      return
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}

//gets the user if it exists
function checkUserExists(email, password, checkCb){
  if(email != "" && password != ""){
    var query = ds.createQuery([kind2]);
    query.filter('email', email);
    query.filter('password', password);

    ds.runQuery(query, (err, entities, cb) => {
      if (err) {
        cb(err);
        return;
      }

      var user = entities[0];

      checkCb(entities.length);

    });
  }
  
}


// Lists all restaurants in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, restaurants, nextPageToken)``.
// [START list]
function list (limit, token, data, cb) {

  var q = ds.createQuery([kind]);
  if (data.usrfoodchoice != "") {
      q.filter('category', '=', data.usrfoodchoice)
  }
  if (data.usrfoodlocation != "") {
      q.filter('city', '=', data.usrfoodlocation)
  }

  q.limit(limit).start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }

    let restaurantsMap = entities.map(fromDatastore);

    for (var key = 0; key < restaurantsMap.length; key++) {
      if (restaurantsMap[key]["menu"].indexOf(data.usrmeal.toUpperCase()) === -1) {
        console.log("Restaurant " + restaurantsMap[key]["name"] + " don't have " + data.usrmeal + " in the menu.");
        restaurantsMap.splice(key, 1);
        key--;
      }
    }

    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    cb(null, restaurantsMap, hasMore);
  });
}
// [END list]

// Creates a new restaurant or updates an existing restaurant with new data. The provided
// data is automatically translated into Datastore format. The restaurant will be
// queued for background processing.
// [START update]
function update (id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['menu'])
  };

  ds.save(
    entity,
    (err) => {
      data.id = entity.key.id;
      cb(err, err ? null : data);
    }
  );
}
// [END update]

function create (data, cb) {
  update(null, data, cb);
}

function read (id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found'
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete (id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

// [START exports]
module.exports = {
  create,
  read,
  update,
  delete: _delete,
  list,
  checkUserExists,
};
// [END exports]
