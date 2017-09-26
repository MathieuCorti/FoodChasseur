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
    'PORT'
  ])

  // Config file
  .file({ file: path.join(__dirname, 'config.json') })

  // Defaults
  .defaults({
    DATA_BACKEND: 'datastore',
    GCLOUD_PROJECT: 'foodchasseur',
    PORT: 8080
  });

// Check for required settings
checkConfig('GCLOUD_PROJECT');

function checkConfig (setting) {
  if (!nconf.get(setting)) {
    throw new Error(`You must set ${setting} as an environment variable or in config.json!`);
  }
}
