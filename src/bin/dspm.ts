import { Provider } from 'nconf';
import path from 'path';
import {log} from 'util';
import {
  Project,
} from '../main/Project';

const provider = new Provider();

provider
  .env()
  .argv();

const projectPath = path.resolve('.');
const project = new Project(provider, projectPath);

const configuration = require(path.resolve('./dspm.config.js'));

configuration(project);

const taskName = process.argv[2];

const task = project.getTask(taskName);

if (task) {
  task.run();
} else {
  log(`Task ${taskName} not found in project`);
}
