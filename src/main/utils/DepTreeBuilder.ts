import Promise from 'bluebird';
import {find, forEach, some} from 'lodash';
import {satisfies} from 'semver';
import {log} from 'util';
import {Namespace} from '../Namespace';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {DepTreeNode} from './DepTreeNode';
import {ResolutionQueue, ResolutionQueueItem} from './ResolutionQueue';

export function logDepTree(node: DepTreeNode, level: number, depth: number) {
  if (level === depth) {
    return;
  }
  log(`Level: ${level}`);
  log(`Node: ${node.packageName}: ${node.packageVersion}`);
  log(`Resolved by: ${node.resolvedBy}`);
  log(`Deps: `);
  log('');
  forEach(node.children, (child) => {
    logDepTree(child, level + 1, depth);
  });
}

const isInRoot = (
  root: DepTreeNode,
  packageName: string,
): boolean => some(root.children, (child) => child.packageName === packageName);

const semverLookup = (node: DepTreeNode, packageName: string, dependencyValue: string): undefined | DepTreeNode => {
  const childNode = find(node.children, (child) => {
    if (child.packageName !== packageName) {
      return false;
    }
    if (!child.packageVersion) {
      return false;
    }
    return satisfies(child.packageVersion, dependencyValue);
  });

  if (childNode) {
    return childNode;
  }

  if (!node.parent) {
    return;
  }

  return semverLookup(node.parent, packageName, dependencyValue);
};

export class DepTreeBuilder {
  private _root: DepTreeNode = {
    children: [],
  };
  private _queue: ResolutionQueue = new ResolutionQueue();

  constructor(
    private _resolvers: Namespace<DependencyResolver>) {}

  public getRoot(): Promise<DepTreeNode> {
    return this._resolveQueue()
      .then(() => {
        return this._root;
      });
  }

  public resolveDependencies(
    dependencies: {[key: string]: any},
    resolverName: string): void {
    forEach(dependencies, (packageDescription: any, packageName: string) => {
      this._queue.addItem({
        packageDescription,
        packageName,
        parent: this._root,
        resolverName,
      });
    });
  }

  private _resolveQueue(): Promise<void> {
    const queueLevel = this._queue.pullQueue();
    if (queueLevel === undefined) {
      return Promise.resolve();
    }
    return Promise.map(queueLevel, (value: ResolutionQueueItem) => {
      const { parent, packageName, packageDescription } = value;
      const satisfiedNode = semverLookup(parent, packageName, packageDescription);
      if (satisfiedNode) {
        return Promise.resolve(null);
      }
      const _resolverName = value.resolverName || 'default';
      const resolver = this._resolvers.getItem(_resolverName);
      return resolver.getMetaData(packageName, packageDescription).then((childMeta) => {
        const target = isInRoot(this._root, packageName) ? parent : this._root;
        const node: DepTreeNode = {
          children: [],
          dependencies: childMeta.dependencies,
          options: childMeta.options,
          packageName: childMeta.name,
          packageVersion: childMeta.version,
          parent: target,
          resolvedBy: _resolverName,
        };
        target.children.push(node);
        return node;
      });
    }).then((nodes: Array<DepTreeNode | null>) => {
      forEach(nodes, (node: DepTreeNode | null) => {
        if (!node || !node.dependencies) {
          return;
        }
        forEach(node.dependencies, (packageDescription: any, packageName: string) => {
          this._queue.addItem({
            packageDescription,
            packageName,
            parent: node,
          });
        });
      });
    }).then(() => {
      return this._resolveQueue();
    });
  }
}
