import Promise from 'bluebird';

import {LockProvider} from '../caches/LockProvider';
import {Project} from '../Project';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {Task} from '../Task';
import {DepTreeBuilder} from '../utils/DepTreeBuilder';
import {DepTreeNode} from '../utils/DepTreeNode';
import {PackageDescription} from '../utils/package/PackageDescription';
import {convertDependenciesMap} from '../utils/package/PackageJsonParse';

export class DependencyResolveTask extends Task {
  public static create(
    project: Project,
    name: string,
  ): DependencyResolveTask {
    const task = new DependencyResolveTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _packages: {[key: string]: PackageDescription} = {};
  private _resolversNamespace = 'resolvers';
  private _lockProvidersNamespace = 'lock_providers';
  private _lockProviderName = 'default';
  private _rootNode?: DepTreeNode;

  constructor(
    name: string,
    private _project: Project,
  ) {
    super(name, _project);
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

  public getRoot(): DepTreeNode {
    if (!this._rootNode) {
      throw new Error('Root is not ready.');
    }
    return this._rootNode;
  }

  public exec(): Promise<any> {
    const updateLock = this._project.getProperty('updateLock', false);
    const lockProviders = this._project.getNamespace<LockProvider>(this._lockProvidersNamespace);
    const lockProvider = lockProviders.getItem(this._lockProviderName);

    if (updateLock) {
      return this._resolveRoot(lockProvider)
        .tap((rootNode: DepTreeNode) => {
          this._rootNode = rootNode;
        });
    }

    return lockProvider.exists()
      .then((lockExists: boolean) => {
        if (lockExists) {
          return lockProvider.loadDepTree();
        }
        return this._resolveRoot(lockProvider);
      })
      .tap((rootNode: DepTreeNode) => {
        this._rootNode = rootNode;
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
