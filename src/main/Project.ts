import {
  Task,
} from './Task';

export class Project {
  public _tasks: {[key: string]: Task} = {};

  public setTask(name: string, task: Task) {
    if (this._tasks[name]) {
      throw new Error('reasigning of task');
    }
    this._tasks[name] = task;
  }

  public getTask(name: string) {
    return this._tasks[name];
  }
}
