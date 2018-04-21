import Promise from 'bluebird';
import {log} from 'util';
import {Project} from './Project';

export class Task {
  private _dependencies: Task[] = [];
  private _execution?: Promise<any>;

  constructor(
    private name: string,
    private project: Project,
  ) {
  }

  public dependsOn(task: Task | string): Task {
    if (task instanceof Task) {
      this._dependencies.push(task);
    }
    if (typeof task === 'string') {
      this._dependencies.push(this.project.getTask(task));
    }
    return this;
  }

  public upToDate(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public execDeps(): Promise<any> {
    return Promise.all(this._dependencies.map((task) => task.run()));
  }

  public run(): Promise<any> {
    if (!this._execution) {
      this._execution = this.execDeps()
        .then(() => this.upToDate())
        .then((isUpToDate: boolean) => {
          if (isUpToDate) {
            log(`${this.name} is up to date`);
            return Promise.resolve();
          }
          log(`Executing ${this.name}`);
          return this.exec();
        })
        .catch((e: any) => {
          /* tslint:disable */
          console.error('');
          console.error('===============');
          console.error('|||||||||||||||');
          console.error('///////////////');
          console.error(e);
          console.error('');
          process.exit(-1);
          /* tslint:enable */
        });
    }
    return this._execution;
  }

  public exec(): Promise<any> {
    log(`Exec: ${this.name}`);
    return Promise.resolve();
  }
}
