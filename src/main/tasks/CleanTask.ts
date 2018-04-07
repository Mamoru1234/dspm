import Promise from 'bluebird';
import rimraf from 'rimraf';
import {Project} from '../Project';
import {Task} from '../Task';

const rimrafAsync = Promise.promisify(rimraf);

export class CleanTask extends Task {
  private _cleanGlobs: string[] = [];

  public clean(glob: string): CleanTask {
    this._cleanGlobs.push(glob);
    return this;
  }

  public exec(): Promise<any> {
    return Promise.map(this._cleanGlobs, (glob) => rimrafAsync(glob));
  }
}

export function createCleanTask(
  project: Project,
  name: string,
  configurator: (task: CleanTask) => void): CleanTask {
  const task = new CleanTask(name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}
