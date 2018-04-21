import Promise from 'bluebird';
import {existsSync} from 'fs';
import rimraf from 'rimraf';
import {Project} from '../Project';
import {Task} from '../Task';

const rimrafAsync = Promise.promisify(rimraf);

export class CleanTask extends Task {

  public static create(
    project: Project,
    name: string,
    configurator: (task: CleanTask) => void,
  ) {
    const task = new CleanTask(name, project);
    configurator(task);
    project.setTask(name, task);
    return task;
  }

  private _cleanGlobs: string[] = [];

  public upToDate(): Promise<boolean> {
    const isUpToDate = this._cleanGlobs.every((glob) => !existsSync(glob));
    return Promise.resolve(isUpToDate);
  }

  public clean(glob: string): CleanTask {
    this._cleanGlobs.push(glob);
    return this;
  }

  public exec(): Promise<any> {
    return Promise.map(this._cleanGlobs, (glob) => rimrafAsync(glob));
  }
}
