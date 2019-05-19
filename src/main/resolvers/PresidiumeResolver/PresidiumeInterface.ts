export interface PresidiumeResolverOptions {
  resolverName: string;
  repositoryUrl: string;
  publicKeyFile: string;
  requestTimeout: number;
  packageSizeLimit: number;
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

export interface PresPackageArtifact {
  name: string;
  version: string;
  integrity: string;
  parameters: {[key: string]: string};
  dependencies: {
    dependencies?: {[key: string]: string};
    devDependencies?: {[key: string]: string};
  };
}

export interface PresPackageMetaOptions {
  integrity: string;
  parameters: {[key: string]: string};
}

export interface PresSignedMessage {
  payload: any;
  signature: string;
}
