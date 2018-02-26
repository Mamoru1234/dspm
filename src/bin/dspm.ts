import {
  Project
} from '../main/Project';

const path = require('path');

// const projectPath = path.resolve('.');
const project = new Project();

const configuration = require(path.resolve('./dspm.config.js'));

configuration(project);

const taskName = process.argv[2];

project.getTask(taskName).run();
