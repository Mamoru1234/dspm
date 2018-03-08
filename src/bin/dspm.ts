import path from 'path';
import {
  Project,
} from '../main/Project';

const projectPath = path.resolve('.');
const project = new Project(projectPath);

const configuration = require(path.resolve('./dspm.config.js'));

configuration(project);

const taskName = process.argv[2];

project.getTask(taskName).run();
