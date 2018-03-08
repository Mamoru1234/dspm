import {spawn} from 'child_process';
import {log} from 'util';
import {Project} from './Project';
import { Task } from './Task';

export class CmdTask extends Task {
  private _command: string = '';

  public command(command: string): CmdTask {
    this._command = command;
    return this;
  }

  public exec(): Promise<any> {
    if (!this.command) {
      return Promise.resolve();
    }
    return new Promise((res, rej): void => {
      log(this._command);
      const [command, ...args] = this._command.split(' ');
      const proc = spawn(command, args);
      proc.on('error', (err: any) => {
        rej(err);
      });
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
      proc.on('exit', () => {
        res();
      });
    });
  }
}

export function createCmdTask(project: Project, name: string, configurator: (task: CmdTask) => void): CmdTask {
  const task = new CmdTask(name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}
