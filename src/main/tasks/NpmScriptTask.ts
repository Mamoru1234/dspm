import Promise from 'bluebird';
import {join} from 'path';
import {Project} from '../Project';
import {CmdTask} from './CmdTask';
import {InstallTask} from './InstallTask';

export class NpmScriptTask extends CmdTask {
  public static create(
    project: Project,
    name: string,
    configurator: (task: NpmScriptTask) => void,
  ): NpmScriptTask {
    const task = new NpmScriptTask(name, project);
    configurator(task);
    project.setTask(name, task);
    return task;
  }

  public _installTaskName: string = 'install';

  constructor(name: string, project: Project) {
    super(name, project);
  }

  public run(): Promise<any> {
    const installTask = this.project.getTask<InstallTask>(this._installTaskName);
    this.dependsOn(installTask);
    const binPath = join(installTask._targetPath, installTask._modulePrefix, '.bin');
    this.addToPath(binPath);
    return super.run();
  }
}
