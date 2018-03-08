import {map} from 'lodash';
import {join, resolve} from 'path';
import {log} from 'util';

import {Namespace} from './Namespace';
import {Project} from './Project';
import {DependencyResolver} from './resolvers/DependencyResolver';
import {Task} from './Task';
import {DepTreeBuilder, DepTreeNode, logDepTree} from './utils/DepTreeBuilder';

export class DependencyTask extends Task {
  private _packages: {[key: string]: {[key: string]: string}} = {};
  private _modulePrefix: string = 'node_modules';
  private _resolversNamespace = 'resolvers';
  private _targetPath: string;

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

  public dependencies(resolver: string, description: {[key: string]: string}) {
    this._packages[resolver] = Object.assign({}, description);
    return this;
  }

  public exec(): Promise<any> {
    const resolvers = this._project.getNamespace<DependencyResolver>(this._resolversNamespace);
    const depTreeBuilder = new DepTreeBuilder(resolvers);
    return Promise.all(map(this._packages, (resolverDeps: {[key: string]: string}, resolverName: string) => {
      return depTreeBuilder.resolveDependencies(resolverDeps, resolverName);
    })).then(() => {
      const root = depTreeBuilder.getRoot();
      logDepTree(root, 0, 4);
      return this.__exctractDepNode(join(this._targetPath, this._modulePrefix), root, resolvers);
    });
  }

  private __exctractDepNode(
    targetPath: string,
    node: DepTreeNode,
    resolvers: Namespace<DependencyResolver>): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.metadata || !child.resolvedBy) {
        return Promise.resolve(null);
      }
      const resolver = resolvers.getItem(child.resolvedBy);
      return resolver.extract(targetPath, child.metadata)
        .then((folderName: string) => {
          log(`Exctracted into ${folderName}`);
          return this.__exctractDepNode(join(folderName, this._modulePrefix), child, resolvers);
        });
    }));
  }
}

export function createDepTask(
  project: Project,
  name: string,
  configurator: (task: DependencyTask) => void): DependencyTask {
  const task = new DependencyTask(name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}

export function refineDepTask(
  project: Project,
  name: string,
  configurator: (task: DependencyTask) => void): DependencyTask {
  const task = project.getTask(name) as DependencyTask;
  configurator(task);
  return task;
}
