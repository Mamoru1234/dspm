import Promise from 'bluebird';
import {map} from 'lodash';
import {join, resolve} from 'path';
import {log} from 'util';

import {LockProvider} from '../caches/LockProvider';
import {Namespace} from '../Namespace';
import {Project} from '../Project';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {Task} from '../Task';
import {DepTreeBuilder} from '../utils/DepTreeBuilder';
import {DepTreeNode} from '../utils/DepTreeNode';
import {BinProvider} from '../utils/package/BinProvider';
import {PackageDescription} from '../utils/package/PackageDescription';
import {convertDependenciesMap} from '../utils/package/PackageJsonParse';

export class InstallTask extends Task {

  public static create(
    project: Project,
    name: string,
    configurator: (task: InstallTask) => void,
  ): InstallTask {
    const task = new InstallTask(name, project);
    configurator(task);
    project.setTask(name, task);
    return task;
  }

  public static refine(
    project: Project,
    name: string,
    configurator: (task: InstallTask) => void,
  ): InstallTask {
    const task = project.getTask(name) as InstallTask;
    configurator(task);
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
    this._targetPath = resolve(path);
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

    return rootPromise
      .then((root: DepTreeNode) => {
        const targetPath = join(this._targetPath, this._modulePrefix);
        const binProvider = new BinProvider(join(targetPath, '.bin'));
        return this.__exctractDepNode(targetPath, root, binProvider, resolvers);
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

  private __exctractDepNode(
    targetPath: string,
    node: DepTreeNode,
    binProvider: BinProvider,
    resolvers: Namespace<DependencyResolver>): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.packageName || !child.packageVersion || !child.resolvedBy) {
        return Promise.resolve(null);
      }
      const resolver = resolvers.getItem(child.resolvedBy);
      return binProvider.extractNode(targetPath, child, resolver)
        .then((folderName: string) => {
          log(`Exctracted into ${folderName}`);
          return this.__exctractDepNode(join(folderName, this._modulePrefix), child, binProvider, resolvers);
        });
    }));
  }
}
