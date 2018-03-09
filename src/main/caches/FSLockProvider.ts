import {readFile, writeFile} from 'fs';
import map from 'lodash/map';
import {DepTreeNode} from '../utils/DepTreeBuilder';
import {LockProvider} from './LockProvider';

interface PureDepTreeNode {
  packageName?: string;
  packageVersion?: string;
  dependencies?: {[key: string]: string};
  options?: any;
  resolvedBy?: string;
  children: DepTreeNode[];
}

export class FSLockProvider implements LockProvider {
  constructor(private _lockPath: string) {
    this._serializeNode = this._serializeNode.bind(this);
  }

  public loadDepTree(): Promise<DepTreeNode> {
    return new Promise((res, rej) => {
      readFile(this._lockPath, (err, data) => {
        if (err) {
          rej(err);
          return;
        }
        const root: DepTreeNode = {
          children: [],
        };
        const parsedData: PureDepTreeNode = JSON.parse(data.toString());
        root.children = map(parsedData.children, (child) => {
          return this._loadNode(root, child);
        });
        res(root);
      });
    });
  }

  public saveDepTree(root: DepTreeNode): Promise<void> {
    const serializableRoot: PureDepTreeNode = {
      children: map(root.children, this._serializeNode),
    };
    return new Promise((res, rej) => {
      writeFile(this._lockPath, JSON.stringify(serializableRoot), (err) => {
        if (err) {
          rej(err);
          return;
        }
        res();
      });
    });
  }

  private _loadNode(parent: DepTreeNode, node: PureDepTreeNode): DepTreeNode {
    const resultNode: DepTreeNode = {
      children: [],
      dependencies: node.dependencies,
      options: node.options,
      packageName: node.packageName,
      packageVersion: node.packageVersion,
      parent,
      resolvedBy: node.resolvedBy,
    };
    resultNode.children = map(node.children, (child: DepTreeNode) => {
      return this._loadNode(resultNode, child);
    });
    return resultNode;
  }

  private _serializeNode(node: DepTreeNode): PureDepTreeNode {
    return {
      children: map(node.children, this._serializeNode),
      dependencies: node.dependencies,
      options: node.options,
      packageName: node.packageName,
      packageVersion: node.packageVersion,
      resolvedBy: node.resolvedBy,
    };
  }
}
