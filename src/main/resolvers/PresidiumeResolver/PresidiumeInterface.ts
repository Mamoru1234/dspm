export interface PresidiumeResolverOptions {
  resolverName: string;
  repositoryUrl: string;
  publicKeyFile: string;
}

export interface PresidiumeResolverArgs {
  packageName: string;
  packageVersion: string;
}

export interface PresPackageMeta {
  name: string;
  versions: PresPackageVersionDescription[];
}

export interface PresPackageVersionDescription {
  name: string;
  version: string;
  parameters: string[];
  dependencies: {[key: string]: string};
}

export interface PresSignedMessage {
  payload: any;
  signature: string;
}
