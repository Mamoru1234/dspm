import {DependencyResolver, PackageMetaData} from "../resolvers/DependencyResolver";
import {map, forEach, find, some} from 'lodash';
import {log} from "util";
import { satisfies } from 'semver';
import {AutoReleaseSemaphore} from "./Semaphore";

export interface DepTreeNode {
  packageName?: string,
  packageVersion?: string,
  metadata?: PackageMetaData
  parent?: DepTreeNode
  children: Array<DepTreeNode>
}

export function logDepTree(node: DepTreeNode, level: number, depth: number) {
  if (level === depth) return;
  log(`Level: ${level}`);
  log(`Node: ${node.packageName}: ${node.packageVersion}`);
  log(`Deps: `);
  log('');
  forEach(node.children, (child) => {
    logDepTree(child, level + 1, depth);
  });
}

const isInRoot = (
  root: DepTreeNode,
  packageName: string
): boolean => some(root.children, (child) => child.packageName === packageName);

const semverLookup = (node: DepTreeNode, packageName: string, dependencyValue: string): undefined | DepTreeNode => {
  const childNode = find(node.children, (child) => {
    if (child.packageName !== packageName) return false;
    if (!child.packageVersion) return false;
    return satisfies(child.packageVersion, dependencyValue);
  });

  if (childNode) {
    return childNode;
  }

  if (!node.parent) return;

  return semverLookup(node.parent, packageName, dependencyValue);
};

export class DepTreeBuilder {
  private __resolveSemaphore: AutoReleaseSemaphore = new AutoReleaseSemaphore(1);

  constructor(private __resolver: DependencyResolver) {}

  private __resolveDependency(
    root: DepTreeNode,
    parent: DepTreeNode,
    dependencies: {[key: string]: any}): Promise<any> {
    return this.__resolveSemaphore.acquire(() => {
      return Promise.all(map(dependencies, (childValue, childKey) => {
        const satisfiedNode = semverLookup(parent, childKey, childValue);
        if (satisfiedNode) {
          return Promise.resolve(null);
        }
        const target = isInRoot(root, childKey) ? parent : root;
        return this.__resolver.getMetaData(childKey, childValue).then((childMeta) => {
          const node = {
            parent: target,
            packageName: childMeta.name,
            packageVersion: childMeta.version,
            metadata: childMeta,
            children: [],
          };
          target.children.push(node);
          return node;
        });
      }));
    }).then((nodes: (DepTreeNode | null)[]) => {
      return Promise.all(map(nodes, (node: DepTreeNode) => {
        if (!node) return Promise.resolve(null);
        if (!node.metadata) return Promise.resolve(null);
        return this.__resolveDependency(root, node, node.metadata.dependencies);
      }));
    });
  }

  public buildDependencyTree(dependencies: {[key: string]: any}): Promise<DepTreeNode> {
    const root = {
      children: []
    };
    return this.__resolveDependency(root, root, dependencies)
      .then(() => root);
  }
}