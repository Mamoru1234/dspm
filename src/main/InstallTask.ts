import {map} from 'lodash';
import {join, resolve} from 'path';
import {log} from 'util';

import {LockProvider} from './caches/LockProvider';
import {Namespace} from './Namespace';
import {Project} from './Project';
import {DependencyResolver} from './resolvers/DependencyResolver';
import {Task} from './Task';
import {DepTreeBuilder, DepTreeNode, logDepTree} from './utils/DepTreeBuilder';

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
    const depTreeBuilder = new DepTreeBuilder(resolvers);
    const fromLock = this._project.getProperty('fromLock');
    let root: DepTreeNode;

    const rootPromise: Promise<any> = fromLock
      ? lockProviders.getItem(this._lockProviderName).loadDepTree().then((lockRoot) => {
        root = lockRoot;
      })
      : Promise.all(map(this._packages, (resolverDeps: {[key: string]: string}, resolverName: string) => {
        return depTreeBuilder.resolveDependencies(resolverDeps, resolverName);
      })).then(() => {
        root = depTreeBuilder.getRoot();
      });

    return rootPromise
      .then(() => {
        logDepTree(root, 0, 4);
        if (fromLock) {
          return Promise.resolve();
        }
        return lockProviders.getItem(this._lockProviderName).saveDepTree(root);
      })
      .then(() => {
        return this.__exctractDepNode(join(this._targetPath, this._modulePrefix), root, resolvers);
      });
  }

  private __exctractDepNode(
    targetPath: string,
    node: DepTreeNode,
    resolvers: Namespace<DependencyResolver>): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.packageName || !child.packageVersion || !child.resolvedBy) {
        return Promise.resolve(null);
      }
      const resolver = resolvers.getItem(child.resolvedBy);
      return resolver.extract(targetPath, child)
        .then((folderName: string) => {
          log(`Exctracted into ${folderName}`);
          return this.__exctractDepNode(join(folderName, this._modulePrefix), child, resolvers);
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
