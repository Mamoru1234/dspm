import Promise from 'bluebird';
import {copy} from 'fs-extra';
import {Project} from '../Project';
import {Task} from '../Task';
import {normalizePath} from '../utils/PathUtils';

const copyAsync = Promise.promisify(copy);

export class CopyTask extends Task {
  public static create(project: Project, name: string): CopyTask {
    const task = new CopyTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _fromPath: string = '';
  private _targetPath: string = '';

  public from(source: string): this {
    this._fromPath = normalizePath(this.project.getProjectPath(), source);
    return this;
  }

  public into(targetPath: string): this {
    this._targetPath = normalizePath(this.project.getProjectPath(), targetPath);
    return this;
  }

  public exec(): Promise<any> {
    if (!this._fromPath) {
      throw new Error(`You should specify from path`);
    }
    if (!this._targetPath) {
      throw new Error(`You should specify target path`);
    }
    return copyAsync(this._fromPath, this._targetPath);
  }
}
