import Promise from 'bluebird';
import {DepTreeNode} from '../utils/DepTreeNode';
import {PackageDescription} from '../utils/package/PackageDescription';

export interface PackageMetaData<T = any> {
  name: string;
  version: string;
  options: T;
  dependencies: {[key: string]: string};
}

export interface DependencyResolver {
  parseDependencyItem(dependencyKey: string, dependencyDescription: string): PackageDescription;
  extract(targetFolder: string, node: DepTreeNode): Promise<void>;
  getMetaData(packageDescription: PackageDescription): Promise<PackageMetaData>;
}
