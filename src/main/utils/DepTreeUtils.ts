import Promise from 'bluebird';

import {DepTreeNode} from './DepTreeNode';

export type NodeMapper = (node: DepTreeNode, context: any) => Promise<any>;

export function deepTraversal(node: DepTreeNode, mapper: NodeMapper, context: any): Promise<any> {
  return Promise.map(node.children, (child: DepTreeNode) => {
    return mapper(child, context)
      .then((newContext: any) => deepTraversal(child, mapper, newContext));
  });
}

// export function breadTraversal(node: DepTreeNode, mapper: NodeMapper): Promise<any> {
//   return Promise.map(node.children, (child: DepTreeNode) => {
//     return breadTraversal(child, mapper)
//       .then(() => mapper(child));
//   });
// }
