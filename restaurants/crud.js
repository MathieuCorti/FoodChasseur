'use strict';

const express = require('express');
const bodyParser = require('body-parser');

function getModel () {
  return require(`./model-${require('../config').get('DATA_BACKEND')}`);
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
 * GET /restaurants/add
 *
 * Display a page of restaurants (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
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
router.post('/add', (req, res, next) => {
  const data = req.body;

  // Save the data to the database.
  getModel().create(data, (err, savedData) => {
    if (err) {
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
