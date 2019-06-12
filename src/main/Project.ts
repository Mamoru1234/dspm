import has from 'lodash/has';
import {Provider} from 'nconf';

import {Namespace} from './Namespace';
import {Task} from './Task';

export class Project {
  private _tasks: {[key: string]: any} = {};
  private _namespaces: {[key: string]: Namespace<any>} = {};
  private _subProjects: {[key: string]: Project} = {};

  constructor(
    private _provider: Provider,
    private _packageJson: any,
    private _projectPath: string) {}

  public setSubProjects(subProjects: {[key: string]: Project}) {
    this._subProjects = subProjects;
  }

  public getSubProject(projectName: string): Project {
    if (!has(this._subProjects, projectName)) {
      throw new Error(`Unknown sub-project ${projectName}`);
    }
    return this._subProjects[projectName];
  }

  public getProjectPath() {
    return this._projectPath;
  }

  public getPackageJson() {
    return this._packageJson;
  }

  public getProperty(key: string, defaultValue?: any) {
    const _providerValue = this._provider.get(key);
    if (_providerValue === undefined) {
      return defaultValue;
    }
    return _providerValue;
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

  public getTask<T = Task>(name: string) {
    if (!has(this._tasks, name)) {
      throw new Error(`Unknown task ${name}`);
    }
    return this._tasks[name] as T;
  }
}
