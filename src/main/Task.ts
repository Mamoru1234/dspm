import {log} from 'util';
import {Project} from './Project';

export class Task {
  private _dependencies: Task[] = [];

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

  public upToDate() {
    return false;
  }

  public execDeps(): Promise<any> {
    return Promise.all(this._dependencies.map((task) => task.run()));
  }

  public run(): Promise<any> {
    return this.execDeps().then(() => {
      if (this.upToDate()) {
        return Promise.resolve();
      }
      return this.exec();
    }).catch((e: any) => {
      log(e);
    });
  }

  public exec(): Promise<any> {
    // tslint:disable-next-line
    console.log(`Exec: ${this.name}`);
    return Promise.resolve();
  }
}
