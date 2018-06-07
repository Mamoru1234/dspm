#!/usr/bin/env node
import {resolve} from 'path';
import {error} from 'util';

import { ProjectCreator } from '../main/ProjectCreator';

try {
  const project = ProjectCreator.createProject(resolve('.'));
  const taskName = process.argv[2];

  const task = project.getTask(taskName);

  if (task) {
    task.run()
      .catch((e: any) => {
        error('Error during task execution');
        error(e);
        process.exit(-1);
      });
  } else {
    error(`Task ${taskName} not found in project`);
    process.exit(-1);
  }
} catch (e) {
  error('Error during project evaluation');
  error(e);
  process.exit(-1);
}
