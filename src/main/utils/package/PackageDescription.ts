export interface PackageDescription<T = any> {
  resolverName: string;
  resolverArgs: T;
  semVersion?: string;
}
