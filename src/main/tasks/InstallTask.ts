import Promise from 'bluebird';
import {join} from 'path';
import rimraf from 'rimraf';

import {LockProvider} from '../caches/LockProvider';
import {Project} from '../Project';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {Task} from '../Task';
import {DepTreeBuilder} from '../utils/DepTreeBuilder';
import {DepTreeNode} from '../utils/DepTreeNode';
import {ExtractTreeProvider} from '../utils/ExtractTreeProvider';
import {PackageDescription} from '../utils/package/PackageDescription';
import {convertDependenciesMap} from '../utils/package/PackageJsonParse';
import {normalizePath} from '../utils/PathUtils';

const rimrafAsync = Promise.promisify(rimraf);

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
  private _packages: {[key: string]: PackageDescription} = {};
  private _resolversNamespace = 'resolvers';
  private _lockProvidersNamespace = 'lock_providers';
  private _lockProviderName = 'default';

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

  public lockProvider(name: string) {
    this._lockProviderName = name;
    return this;
  }

  public dependencies(description: {[key: string]: any}) {
    const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
    const parsedDependencies = convertDependenciesMap(resolvers, description);
    Object.assign(this._packages, parsedDependencies);
    return this;
  }

  public exec(): Promise<any> {
    const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
    const lockProviders = this._project.getNamespace<LockProvider>(this._lockProvidersNamespace);

    const lockProvider = lockProviders.getItem(this._lockProviderName);

    const rootPromise: Promise<DepTreeNode> = this._getDepTree(lockProvider);
    const targetPath = join(this._targetPath, this._modulePrefix);

    return rootPromise
      .tap(() => rimrafAsync(targetPath))
      .then((root: DepTreeNode) => {
        return new ExtractTreeProvider(this._targetPath, this._modulePrefix, resolvers).extractTree(root);
      });
  }

  private _getDepTree(
    lockProvider: LockProvider,
  ) {
    const updateLock = this._project.getProperty('updateLock', false);

    if (updateLock) {
      return this._resolveRoot(lockProvider);
    }

    return lockProvider.exists()
      .then((lockExists: boolean) => {
        if (lockExists) {
          return lockProvider.loadDepTree();
        }
        return this._resolveRoot(lockProvider);
      });
  }

  private _resolveRoot(
    lockProvider: LockProvider,
  ): Promise<DepTreeNode> {
    const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
    const depTreeBuilder = new DepTreeBuilder(resolvers);
    depTreeBuilder.resolveDependencies(this._packages);
    return depTreeBuilder.getRoot()
      .then((root: DepTreeNode) => {
        return lockProvider.saveDepTree(root)
          .then(() => root);
      });
  }
}
