'use strict';

const url = require('url');
const express = require('express');
const bodyParser = require('body-parser');
const Vision = require('@google-cloud/vision');
const vision = Vision();
const config = require('../config');
const Multer = require('multer');
const Storage = require('@google-cloud/storage');
const multer = Multer({
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb
  }
});

const CLOUD_BUCKET = config.get('CLOUD_BUCKET');
const storage = Storage({
  projectId: CLOUD_BUCKET
});
const bucket = storage.bucket(CLOUD_BUCKET);


function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
}

function getModel () {
  return require(`./model-${require('../config').get('DATA_BACKEND')}`);
}

function sendUploadToGCS (req, res, next) {
  if (!req.file) {
    console.log("File not here.");
    return next();
  } else {
    console.log("File is here baby !");
  }

  const gcsname = /*Date.now() +*/ req.file.originalname;
  const file = bucket.file(gcsname);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  stream.on('error', (err) => {
    console.log("Error while uploading to bucket!");
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsname;
    file.makePublic().then(() => {
      req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
      next();
    });
  });

  stream.end(req.file.buffer);
}

const router = express.Router();

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /restaurants
 *
 * Display a page of restaurants (up to ten at a time).
 */
router.get('/', (req, res, next) => {
 res.render('base.pug');
 });
//});

/**
 * GET /restaurants/list
 *
 * Display a form for creating a restaurant.
 */
// [START add_get]
router.get('/list', (req, res) => {
 console.log("Food choice : " + req.url);
 var q = url.parse(req.url, true);
 console.log("Food choice : " + q.search);
 var qdata = q.query;
 console.log("Food Query : " + qdata.usrfoodchoice);
 getModel().list(10, req.query.pageToken, qdata.usrfoodchoice, (err, entities, cursor) => {
  if (err) {
    next(err);
    return;
  }
  console.log("Number of restaurants on render : " + entities.length);
  res.render('restaurants/list.pug', {
    restaurants: entities,
    nextPageToken: cursor
  });
 });
});
// [END add_get]

/**
 * GET /restaurants/add
 *
 * Display a form for creating a restaurant.
 */
// [START add_get]
router.get('/add', (req, res) => {
  res.render('restaurants/form.pug', {
    restaurant: {},
    action: 'Add'
  });
});
// [END add_get]

/**
 * POST /restaurants/add
 *
 * Create a restaurant.
 */
// [START add_post]
router.post('/add', multer.single('image'), sendUploadToGCS , (req, res, next) => {
  const data = req.body;

  //console.log("Url : [" + req.file.cloudStoragePublicUrl + "].");
  if (req.file && req.file.cloudStoragePublicUrl) {

    const gcsPath = `gs://${CLOUD_BUCKET}/${req.file.originalname}`;
    console.log("Public Path  : [" + req.file.cloudStoragePublicUrl + "].");

    // console.log("Lot number : " + req.body.restaurant.lotnumber);

    // Send the image to the Cloud Vision API
    vision.textDetection({ source: { imageUri: gcsPath } })
      .then((results) => {
        const detections = results[0].fullTextAnnotation;
        console.log('Text:' + detections.text);
      })
      .catch((err) => {
        console.error('ERROR:', err);
      });
  } else {
    console.log("Failed !");
  }

  // Save the data to the database.
  getModel().create(data, (err, savedData) => {
    if (err) {
      console.log("Error : " + err);
      next(err);
      return;
    }
    res.redirect(`${req.baseUrl}/${savedData.id}`);
  });
});
// [END add_post]

/**
 * GET /restaurants/:id/edit
 *
 * Display a restaurant for editing.
 */
router.get('/:restaurant/edit', (req, res, next) => {
  getModel().read(req.params.restaurant, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('restaurants/form.pug', {
      restaurant: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /restaurants/:id/edit
 *
 * Update a restaurant.
 */
router.post('/:restaurant/edit', (req, res, next) => {
  const data = req.body;

  getModel().update(req.params.restaurant, data, (err, savedData) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(`${req.baseUrl}/${savedData.id}`);
  });
});

/**
 * GET /restaurants/:id
 *
 * Display a restaurant.
 */
router.get('/:restaurant', (req, res, next) => {
  getModel().read(req.params.restaurant, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('restaurants/view.pug', {
      restaurant: entity
    });
  });
});

/**
 * GET /restaurants/:id/delete
 *
 * Delete a restaurant.
 */
router.get('/:restaurant/delete', (req, res, next) => {
  getModel().delete(req.params.restaurant, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/restaurants/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
