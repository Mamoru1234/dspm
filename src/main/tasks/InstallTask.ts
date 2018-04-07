import Promise from 'bluebird';
import {forEach, map} from 'lodash';
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

export class InstallTask extends Task {
  private _packages: {[key: string]: {[key: string]: string}} = {};
  private _modulePrefix: string = 'node_modules';
  private _resolversNamespace = 'resolvers';
  private _lockProvidersNamespace = 'lock_providers';
  private _targetPath: string;
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

  public dependencies(resolver: string, description: {[key: string]: string}) {
    this._packages[resolver] = Object.assign({}, description);
    return this;
  }

  public exec(): Promise<any> {
    const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
    const lockProviders = this._project.getNamespace<LockProvider>(this._lockProvidersNamespace);
    const fromLock = this._project.getProperty('fromLock');

    const rootPromise: Promise<DepTreeNode> = fromLock
      ? lockProviders.getItem(this._lockProviderName).loadDepTree()
      : this._resolveRoot(resolvers, lockProviders);

    return rootPromise
      .then((root: DepTreeNode) => {
        const targetPath = join(this._targetPath, this._modulePrefix);
        const binProvider = new BinProvider(join(targetPath, '.bin'));
        return this.__exctractDepNode(targetPath, root, binProvider, resolvers);
      });
  }

  private _resolveRoot(
    resolvers: Namespace<DependencyResolver>,
    lockProviders: Namespace<LockProvider>,
  ): Promise<DepTreeNode> {
    const depTreeBuilder = new DepTreeBuilder(resolvers);
    forEach(this._packages, (resolverDeps: {[key: string]: string}, resolverName: string) => {
      return depTreeBuilder.resolveDependencies(resolverDeps, resolverName);
    });
    return depTreeBuilder.getRoot()
      .then((root: DepTreeNode) => {
        return lockProviders.getItem(this._lockProviderName).saveDepTree(root)
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

export function createInstallTask(
  project: Project,
  name: string,
  configurator: (task: InstallTask) => void): InstallTask {
  const task = new InstallTask(name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}

export function refineInstallTask(
  project: Project,
  name: string,
  configurator: (task: InstallTask) => void): InstallTask {
  const task = project.getTask(name) as InstallTask;
  configurator(task);
  return task;
}
