export interface PackageDescription {
  resolverName: string;
  resolverArgs: {[key: string]: any};
  semVersion?: string;
}
