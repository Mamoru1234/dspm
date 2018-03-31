import Promise from 'bluebird';
import {DepTreeNode} from '../utils/DepTreeNode';

export interface PackageMetaData {
  name: string;
  version: string;
  options: any;
  dependencies: {[key: string]: string};
}

export interface DependencyResolver {
  extract(targetFolder: string, node: DepTreeNode): Promise<string>;
  getMetaData(packageName: string, packageDescription: any): Promise<PackageMetaData>;
}
