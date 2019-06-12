#!/usr/bin/env node
import log4js from 'log4js';
import {resolve} from 'path';
import { configure, LOG_FILE_PATH } from '../main/configure/ConfigureLog';
import { ProjectCreator } from '../main/ProjectCreator';

configure();

const logger = log4js.getLogger('bin/dspm');

async function main() {
  const project = await ProjectCreator.createProject(resolve('.'));
  const taskName = process.argv[2];

  const task = project.getTask(taskName);

  if (task) {
    task.run()
      .catch((e: any) => {
        logger.error('Error during task execution');
        logger.error(e);
        process.exit(-1);
      });
  } else {
    logger.error(`Task ${taskName} not found in project`);
    process.exit(-1);
  }
}

process.on('exit', (code: number) => {
  if (code !== 0) {
    // tslint:disable-next-line
    console.log(`Log file path: ${LOG_FILE_PATH}`);
  }
});

main()
  .catch((e) => {
    logger.error('Error during project evaluation');
    logger.error(e);
    process.exit(-1);
  });
