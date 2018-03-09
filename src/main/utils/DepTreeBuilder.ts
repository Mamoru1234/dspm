import { find, forEach, map, some} from 'lodash';
import { satisfies } from 'semver';
import {log} from 'util';
import {Namespace} from '../Namespace';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {AutoReleaseSemaphore} from './Semaphore';

export interface DepTreeNode {
  packageName?: string;
  packageVersion?: string;
  dependencies?: {[key: string]: string};
  options?: any;
  parent?: DepTreeNode;
  resolvedBy?: string;
  children: DepTreeNode[];
}

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
  private _resolveSemaphore: AutoReleaseSemaphore = new AutoReleaseSemaphore(1);

  constructor(
    private _resolvers: Namespace<DependencyResolver>) {}

  public getRoot(): DepTreeNode {
    return this._root;
  }

  public resolveDependencies(
    dependencies: {[key: string]: any},
    resolverName: string) {
    return this._resolveDependencies(this._root, dependencies, resolverName);
  }

  private _resolveDependencies(
    parent: DepTreeNode,
    dependencies: {[key: string]: any},
    resolverName?: string): Promise<any> {
    return this._resolveSemaphore.acquire(() => {
      return Promise.all(map(dependencies, (childValue, childKey) => {
        const satisfiedNode = semverLookup(parent, childKey, childValue);
        if (satisfiedNode) {
          return Promise.resolve(null);
        }
        const target = isInRoot(this._root, childKey) ? parent : this._root;
        const _resolverName = resolverName || 'default';
        const resolver = this._resolvers.getItem(_resolverName);
        return resolver.getMetaData(childKey, childValue).then((childMeta) => {
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
      }));
    }).then((nodes: Array<DepTreeNode | null>) => {
      return Promise.all(map(nodes, (node: DepTreeNode) => {
        if (!node) {
          return Promise.resolve(null);
        }
        if (!node.dependencies) {
          return Promise.resolve(null);
        }
        return this._resolveDependencies(node, node.dependencies);
      }));
    });
  }
}
