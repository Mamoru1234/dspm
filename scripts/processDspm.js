const fs = require('fs-extra');
const path = require('path');
const {template} = require('lodash');

const rawDspmScript = fs.readFileSync(path.join(__dirname, './dspm')).toString();
const scriptTemplate = template(rawDspmScript);

fs.outputFileSync(path.join(__dirname, './../build/dspm'), scriptTemplate({ version: process.env.DSPM_VERSION }));
