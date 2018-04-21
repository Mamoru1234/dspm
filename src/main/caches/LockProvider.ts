import Promise from 'bluebird';
import {DepTreeNode} from '../utils/DepTreeNode';

export interface LockProvider {
  exists(): Promise<boolean>;
  loadDepTree(): Promise<DepTreeNode>;
  saveDepTree(root: DepTreeNode): Promise<void>;
}
