import Promise from 'bluebird';
import {readFile, writeFile} from 'fs';
import map from 'lodash/map';
import noop from 'lodash/noop';
import {DepTreeNode} from '../utils/DepTreeNode';
import {LockProvider} from './LockProvider';

const readFileAsync = Promise.promisify(readFile);
const writeFileAsync = Promise.promisify(writeFile);

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
    return readFileAsync(this._lockPath)
      .then((data) => {
        const root: DepTreeNode = {
          children: [],
        };
        const parsedData: PureDepTreeNode = JSON.parse(data.toString());
        root.children = map(parsedData.children, (child) => {
          return this._loadNode(root, child);
        });
        return root;
      });
  }

  public saveDepTree(root: DepTreeNode): Promise<void> {
    const serializableRoot: PureDepTreeNode = {
      children: map(root.children, this._serializeNode),
    };
    return writeFileAsync(this._lockPath, JSON.stringify(serializableRoot))
      .then(noop);
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
