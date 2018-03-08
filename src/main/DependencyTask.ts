import {map} from 'lodash';
import {join, resolve} from 'path';
import {log} from 'util';

import {Project} from './Project';
import {DependencyResolver} from './resolvers/DependencyResolver';
import {Task} from './Task';
import {DepTreeBuilder, DepTreeNode, logDepTree} from './utils/DepTreeBuilder';

export class DependencyTask extends Task {
  private _packages: {[key: string]: {[key: string]: string}} = {};
  private _folderPath: string = '';

  constructor(
    private dependencyResolvers: {[key: string]: DependencyResolver},
    name: string,
    project: Project,
  ) {
    super(name, project);
  }

  public targetFolder(folderPath: string) {
    this._folderPath = resolve(folderPath);
  }

  public dependencies(resolver: string, description: {[key: string]: string}) {
    this._packages[resolver] = Object.assign({}, description);
  }

  public exec(): Promise<any> {
    if (!this._folderPath) {
      throw new Error('You should provide modules folder');
    }
    return Promise.all(map(this._packages, (resolverDeps: {[key: string]: string}, resolverName: string) => {
      return new DepTreeBuilder((this.dependencyResolvers[resolverName])).buildDependencyTree(resolverDeps);
    })).then((trees) => {
      const root = trees[0];
      logDepTree(root, 0, 4);
      return this.__exctractDepNode(this._folderPath, root, this.dependencyResolvers.npm);
    });
  }

  private __exctractDepNode(targetPath: string, node: DepTreeNode, resolver: DependencyResolver): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.metadata) {
        return Promise.resolve(null);
      }
      return resolver.extract(targetPath, child.metadata)
        .then((folderName: string) => {
          log(`Exctracted into ${folderName}`);
          return this.__exctractDepNode(join(folderName, 'node_modules'), child, resolver);
        });
    }));
  }
}

export function createDepTask(
  project: Project,
  name: string,
  dependencyResolvers: {[key: string]: DependencyResolver},
  configurator: (task: DependencyTask) => void): DependencyTask {
  const task = new DependencyTask(dependencyResolvers, name, project);
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
