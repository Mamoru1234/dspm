import Promise from 'bluebird';
import merge from 'lodash/merge';
import size from 'lodash/size';
import {Project} from '../Project';
import {Task} from '../Task';
import {executeCommand} from '../utils/CmdUtils';

export class CmdTask extends Task {
  private _command: string = '';
  private _userEnv: {[key: string]: string} = {};

  public command(command: string): CmdTask {
    this._command = command;
    return this;
  }

  public env(envKey: string, envValue: string): CmdTask {
    this._userEnv[envKey] = envValue;
    return this;
  }

  public exec(): Promise<any> {
    if (!this.command) {
      return Promise.resolve();
    }

    if (size(this._userEnv) !== 0) {
      // execute with custom env
      const env = merge({}, process.env, this._userEnv);
      return executeCommand(this._command, { env });
    }

    return executeCommand(this._command);
  }
}

export function createCmdTask(project: Project, name: string, configurator: (task: CmdTask) => void): CmdTask {
  const task = new CmdTask(name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}
