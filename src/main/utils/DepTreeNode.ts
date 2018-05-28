import {PackageDescription} from './package/PackageDescription';

export interface DepTreeNode {
  packageName?: string;
  packageVersion?: string;
  dependencies?: {[key: string]: PackageDescription};
  options?: any;
  parent?: DepTreeNode;
  resolvedBy?: string;
  children: DepTreeNode[];
}
