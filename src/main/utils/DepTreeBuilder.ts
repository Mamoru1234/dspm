import Promise from 'bluebird';
import {find, forEach, some} from 'lodash';
import log4js from 'log4js';
import {satisfies} from 'semver';
import {Namespace} from '../Namespace';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {DepTreeNode} from './DepTreeNode';
import {PackageDescription} from './package/PackageDescription';
import {convertDependenciesMap} from './package/PackageJsonParse';
import {ResolutionQueue, ResolutionQueueItem} from './ResolutionQueue';

const logger = log4js.getLogger('utils/DepTreeBuilder');

export function logDepTree(node: DepTreeNode, level: number, depth: number) {
  if (level === depth) {
    return;
  }
  logger.info(`Level: ${level}`);
  logger.info(`Node: ${node.packageName}: ${node.packageVersion}`);
  logger.info(`Resolved by: ${node.resolvedBy}`);
  logger.info(`Deps: `);
  logger.info('');
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
  private _rootReceived: boolean = false;
  private _queue: ResolutionQueue = new ResolutionQueue();

  constructor(
    private _resolvers: Namespace<DependencyResolver>) {}

  public getRoot(): Promise<DepTreeNode> {
    if (this._rootReceived) {
      throw new Error('Getting root twice is wrong');
    }
    return this._resolveQueue()
      .then(() => {
        return this._root;
      });
  }

  public resolveDependencies(
    dependencies: {[key: string]: PackageDescription},
  ): void {
    forEach(dependencies, (packageDescription: any, packageName: string) => {
      this._queue.addItem({
        packageDescription,
        packageName,
        parent: this._root,
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
      if (packageDescription.semVersion !== undefined) {
        const satisfiedNode = semverLookup(parent, packageName, packageDescription.semVersion);
        if (satisfiedNode) {
          return Promise.resolve(null);
        }
      }
      const resolver = this._resolvers.getItem(packageDescription.resolverName);
      if (!resolver) {
        logger.error('Cannot get resolver for: ' + JSON.stringify(packageDescription));
        throw new Error(`Resolver not found ${packageDescription.resolverName}`);
      }
      return resolver.getMetaData(packageDescription).then((childMeta) => {
        const shouldBeInlined = !packageDescription.semVersion || isInRoot(this._root, packageName);
        const target = shouldBeInlined ? parent : this._root;
        const node: DepTreeNode = {
          children: [],
          dependencies: convertDependenciesMap(this._resolvers, childMeta.dependencies),
          options: childMeta.options,
          packageName: childMeta.name,
          packageVersion: childMeta.version,
          parent: target,
          resolvedBy: packageDescription.resolverName,
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
