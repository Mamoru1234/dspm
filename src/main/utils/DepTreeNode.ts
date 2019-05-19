import {PackageDescription} from './package/PackageDescription';

export interface DepTreeNode<T = any> {
  packageName?: string;
  packageVersion?: string;
  dependencies?: {[key: string]: PackageDescription};
  options?: T;
  parent?: DepTreeNode;
  resolvedBy?: string;
  children: DepTreeNode[];
}
