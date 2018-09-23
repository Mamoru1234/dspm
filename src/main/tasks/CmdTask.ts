import Promise from 'bluebird';
import merge from 'lodash/merge';
import size from 'lodash/size';
import {Project} from '../Project';
import {Task} from '../Task';
import {executeCommand} from '../utils/CmdUtils';
import {normalizePath} from '../utils/PathUtils';

export class CmdTask extends Task {

  public static create(
    project: Project,
    name: string,
  ): CmdTask {
    const task = new CmdTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _command: string = '';
  private _userEnv: {[key: string]: string} = {};
  private _pathItems: string[] = [];

  public command(command: string): CmdTask {
    this._command = command;
    return this;
  }

  public env(envKey: string, envValue: string): CmdTask {
    this._userEnv[envKey] = envValue;
    return this;
  }

  public addToPath(entry: string): CmdTask {
    this._pathItems.push(normalizePath(this.project.getProjectPath(), entry));
    return this;
  }

  public exec(): Promise<any> {
    if (!this.command) {
      return Promise.resolve();
    }

    if (size(this._userEnv) !== 0 || this._pathItems.length !== 0) {
      // execute with custom env
      const env = merge({}, process.env, this._userEnv);
      env.PATH = `${this._pathItems.join(':')}:${env.PATH}`;
      return executeCommand(this._command, {
        cwd: this.project.getProjectPath(),
        env,
      });
    }

    return executeCommand(this._command);
  }
}
