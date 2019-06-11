#!/usr/bin/env node
import {resolve} from 'path';
import {log} from 'util';

import { ProjectCreator } from '../main/ProjectCreator';

async function main() {
  const project = await ProjectCreator.createProject(resolve('.'));
  const taskName = process.argv[2];

  const task = project.getTask(taskName);

  if (task) {
    task.run()
      .catch((e: any) => {
        log('Error during task execution');
        log(e);
        process.exit(-1);
      });
  } else {
    log(`Task ${taskName} not found in project`);
    process.exit(-1);
  }
}

main()
  .catch((e) => {
    log('Error during project evaluation');
    log(e);
    process.exit(-1);
  });
