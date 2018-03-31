export interface DepTreeNode {
  packageName?: string;
  packageVersion?: string;
  dependencies?: {[key: string]: string};
  options?: any;
  parent?: DepTreeNode;
  resolvedBy?: string;
  children: DepTreeNode[];
}
