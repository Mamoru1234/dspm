import {log} from "util";
import {Project} from "./Project";

export class Task {
  dependencies: Array<Task> = [];
  constructor(
    private name: string,
    private project: Project
  ) {
  }

  public dependsOn(task: Task | string): Task {
    if (task instanceof Task) {
      this.dependencies.push(task);
    }
    if (typeof task == 'string') {
      this.dependencies.push(this.project.getTask(task));
    }
    return this;
  }

  public upToDate() {
    return false;
  }

  public execDeps(): Promise<any> {
    return Promise.all(this.dependencies.map((task) => task.run()));
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
    console.log(`Exec: ${this.name}`);
    return Promise.resolve();
  }
}
