'use strict';

const nconf = module.exports = require('nconf');
const path = require('path');

nconf

  // Command-line arguments
  .argv()

  // Environment variables
  .env([
    'DATA_BACKEND',
    'GCLOUD_PROJECT',
    'CLOUD_BUCKET',
    'PORT'
  ])

  // Config file
  .file({ file: path.join(__dirname, 'config.json') })

  // Defaults
  .defaults({
    DATA_BACKEND: 'datastore',
    GCLOUD_PROJECT: 'foodchasseur',
    CLOUD_BUCKET: 'food_chasseur_menus',
    PORT: 8080
  });

// Check for required settings
checkConfig('GCLOUD_PROJECT');
checkConfig('CLOUD_BUCKET');

function checkConfig (setting) {
  if (!nconf.get(setting)) {
    throw new Error(`You must set ${setting} as an environment variable or in config.json!`);
  }
}
