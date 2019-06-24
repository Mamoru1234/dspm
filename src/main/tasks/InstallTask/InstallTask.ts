import Promise from 'bluebird';
import {join} from 'path';
import {Project} from '../../Project';
import {DependencyResolver} from '../../resolvers/DependencyResolver';
import {Task} from '../../Task';
import {rimrafAsync} from '../../utils/AsyncFsUtils';
import {normalizePath} from '../../utils/PathUtils';
import {DependencyResolveTask} from '../DependencyResolveTask';
import {ExtractTreeProvider} from './ExtractTreeProvider';

export class InstallTask extends Task {

  public static create(
    project: Project,
    name: string,
  ): InstallTask {
    const task = new InstallTask(name, project);
    project.setTask(name, task);
    return task;
  }

  public _targetPath: string;
  public _modulePrefix: string = 'node_modules';
  private _resolversNamespace = 'resolvers';
  private _resolveTask = 'dependencyResolve';

  constructor(
    name: string,
    private _project: Project,
  ) {
    super(name, _project);
    this._targetPath = _project.getProjectPath();
  }

  public modulePrefix(modulePrefix: string) {
    this._modulePrefix = modulePrefix;
    return this;
  }

  public targetPath(path: string) {
    this._targetPath = normalizePath(this.project.getProjectPath(), path);
    return this;
  }

  public resolveTask(name: string): this {
    this._resolveTask = name;
    return this;
  }

  public run(): Promise<any> {
    this.dependsOn(this._resolveTask);
    return super.run();
  }

  public exec(): Promise<any> {
    const targetPath = join(this._targetPath, this._modulePrefix);

    return rimrafAsync(targetPath)
      .then(() => {
        const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
        const root = this._project.getTask<DependencyResolveTask>(this._resolveTask).getRoot();
        const extractTreeProvider = new ExtractTreeProvider(this._targetPath, this._modulePrefix, resolvers);
        return extractTreeProvider.extractTree(root);
      });
  }
}
