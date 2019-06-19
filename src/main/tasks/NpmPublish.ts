import Bluebird from 'bluebird';
import {Project} from '../Project';
import {normalizePath} from '../utils/PathUtils';
import {CmdTask} from './CmdTask';

export class NpmPublish extends CmdTask {
  public static create(
    project: Project,
    name: string,
  ): NpmPublish {
    const task = new NpmPublish(project, name);
    project.setTask(name, task);
    return task;
  }
  private _modulePath?: string;
  private _npmToken?: string;
  constructor(project: Project, name: string) {
    super(name, project);
  }

  public modulePath(path: string): this {
    this._modulePath = normalizePath(this.project.getProjectPath(), path);
    return this;
  }

  public token(value: string): this {
    this._npmToken = value;
    return this;
  }

  public run(): Bluebird<any> {
    let options = '';
    if (this._npmToken) {
      options += `--token=${this._npmToken} `;
    }
    this.command(`npm publish ${options} ${this._modulePath}`);
    return super.run();
  }
}
