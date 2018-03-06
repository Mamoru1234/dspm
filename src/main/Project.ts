import {
  Task
} from './Task';

export class Project {
  public __tasks: {[key: string]: Task} = {};
  constructor(
  ) {
  }

  public setTask(name: string, task: Task) {
    if (this.__tasks[name]) {
      throw new Error('reasigning of task');
    }
    this.__tasks[name] = task;
  }

  public getTask(name: string) {
    return this.__tasks[name];
  }
}
