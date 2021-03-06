import Promise from 'bluebird';
import {existsSync} from 'fs';
import {Project} from '../Project';
import {Task} from '../Task';
import {rimrafAsync} from '../utils/AsyncFsUtils';
import {normalizePath} from '../utils/PathUtils';

export class CleanTask extends Task {

  public static create(
    project: Project,
    name: string,
  ) {
    const task = new CleanTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _cleanGlobs: string[] = [];

  public upToDate(): Promise<boolean> {
    const isUpToDate = this._cleanGlobs.every((glob) => !existsSync(glob));
    return Promise.resolve(isUpToDate);
  }

  public clean(glob: string): CleanTask {
    this._cleanGlobs.push(normalizePath(this.project.getProjectPath(), glob));
    return this;
  }

  public exec(): Promise<any> {
    return Promise.map(this._cleanGlobs, (glob) => rimrafAsync(glob));
  }
}
