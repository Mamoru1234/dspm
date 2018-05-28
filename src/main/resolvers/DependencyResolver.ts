import Promise from 'bluebird';
import {DepTreeNode} from '../utils/DepTreeNode';
import {PackageDescription} from '../utils/package/PackageDescription';

export interface PackageMetaData {
  name: string;
  version: string;
  options: any;
  dependencies: {[key: string]: string};
}

export interface DependencyResolver {
  parseDependencyItem(dependencyKey: string, dependencyDescription: string): PackageDescription;
  extract(targetFolder: string, node: DepTreeNode): Promise<string>;
  getMetaData(packageDescription: PackageDescription): Promise<PackageMetaData>;
}
