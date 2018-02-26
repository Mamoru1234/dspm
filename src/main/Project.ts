import {
  Task
} from './Task';

export class Project {
  public tasks: {[key: string]: Task} = {};
  constructor(
  ) {
  }

  public setTask(name: string, task: Task) {
    if (this.tasks[name]) {
      throw new Error('reasigning of task');
    }
    this.tasks[name] = task;
  }

  public getTask(name: string) {
    return this.tasks[name];
  }
}
