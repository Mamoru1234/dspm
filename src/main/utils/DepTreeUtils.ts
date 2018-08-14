import Promise from 'bluebird';
import {join} from 'path';

import {DepTreeNode} from './DepTreeNode';

export type NodeMapper<T> = (node: DepTreeNode, context: T) => Promise<T>;

export function deepTraversal<T>(node: DepTreeNode, mapper: NodeMapper<T>, context: T): Promise<any> {
  return Promise.map(node.children, (child: DepTreeNode) => {
    return mapper(child, context)
      .then((newContext: any) => deepTraversal(child, mapper, newContext));
  });
}

export function breadTraversal(
  node: DepTreeNode,
  modulePrefix: string,
  parentPath: string,
  mapper: (node: DepTreeNode, parentPath: string) => Promise<any>): Promise<any> {
  return Promise.map(node.children, (child: DepTreeNode) => {
    if (!child.packageName || !child.packageVersion || !child.resolvedBy) {
      return Promise.resolve(null);
    }
    const {packageName} = child;
    const modulePath = join(parentPath, modulePrefix, packageName);
    return breadTraversal(child, modulePrefix, modulePath, mapper)
      .then(() => mapper(child, modulePath));
  });
}
