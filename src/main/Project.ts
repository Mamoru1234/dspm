import has from 'lodash/has';
import {Namespace} from './Namespace';
import {
  Task,
} from './Task';

export class Project {
  private _tasks: {[key: string]: Task} = {};
  private _namespaces: {[key: string]: Namespace<any>} = {};

  constructor(private _projectPath: string) {}

  public getProjectPath() {
    return this._projectPath;
  }

  public ensureNameSpace<T>(name: string): Namespace<T> {
    if (!has(this._namespaces, name)) {
      this._namespaces[name] = new Namespace<T>();
    }
    return this._namespaces[name];
  }

  public getNamespace<T>(name: string): Namespace<T> {
    if (!has(this._namespaces, name)) {
      throw new Error(`Your project doesn't have ${name} namespace`);
    }
    return this._namespaces[name];
  }

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
