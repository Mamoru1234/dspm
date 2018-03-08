export interface PackageMetaData {
  name: string;
  version: string;
  options: any;
  dependencies: {[key: string]: string};
}

export interface DependencyResolver {
  extract(targetFolder: string, metaData: PackageMetaData): Promise<string>;
  getMetaData(packageName: string, packageDescription: any): Promise<PackageMetaData>;
}
