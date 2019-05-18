import Promise from 'bluebird';
import fs from 'fs-extra';
import gunzip from 'gunzip-maybe';
import {has, once} from 'lodash';
import {key} from 'openpgp';
import {stringify} from 'query-string';
import {get as getStream} from 'request';
import {get} from 'request-promise';
import {maxSatisfying} from 'semver';
import {pipeline} from 'stream';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {DepTreeNode} from '../../utils/DepTreeNode';
import {PackageDescription} from '../../utils/package/PackageDescription';
import {AutoReleaseSemaphore} from '../../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from '../DependencyResolver';
import {verifyJson} from './OpenPgpUtils';
import {
  PresidiumeResolverArgs,
  PresidiumeResolverOptions,
  PresPackageArtifact,
  PresPackageMeta,
  PresPackageMetaOptions,
  PresPackageVersionDescription,
  PresSignedMessage,
} from './PresidiumeInterface';
import Key = key.Key;

// needed to avoid package/ prefix
const mapNpmTarHeader = (header: Headers) => {
  const packageNameInd = header.name.indexOf('/');
  header.name = header.name.slice(packageNameInd);
  return header;
};

export class PresidiumeResolver implements DependencyResolver {
  private readonly _resolverName: string;
  private readonly _repositoryURL: string;
  private readonly _publicKeyFile: string;
  private _packageMetaCache: {[key: string]: Promise<PresPackageMeta>} = {};
  private _packageArtifactCache: {[key: string]: Promise<PresPackageArtifact>} = {};
  private _packageMetaResolveLimit = new AutoReleaseSemaphore(10);
  private _packageArtifactResolveLimit = new AutoReleaseSemaphore(10);
  constructor({
    resolverName,
    repositoryUrl,
    publicKeyFile,
  }: PresidiumeResolverOptions) {
    this._repositoryURL = repositoryUrl;
    this._resolverName = resolverName;
    this._publicKeyFile = publicKeyFile;
    this._getPublicKey = once(this._getPublicKey);
  }

  public extract(targetFolder: string, depTreeNode: DepTreeNode<PresPackageMetaOptions>): Promise<void> {
    return new Promise<void>((res, rej) => {
      const { packageName, packageVersion, options } = depTreeNode;
      const params = stringify(options!!.parameters);
      const uri = `${this._repositoryURL}/artifact/download/${packageName}/${packageVersion}?${params}`;
      const moduleStream = getStream(uri);
      const tempPipe = pipeline as any;
      tempPipe(moduleStream, gunzip(), extract(targetFolder, { map: mapNpmTarHeader }), (err: Error) => {
        if (err) {
          rej(err);
          return;
        }
        res();
      });
    });
  }

  public getMetaData(packageDescription: PackageDescription<PresidiumeResolverArgs>): Promise<PackageMetaData> {
    return this._getPackageMeta(packageDescription.resolverArgs.packageName)
      .then((packageMeta: PresPackageMeta) => {
        log('Received meta: ' + packageMeta.name);
        const { versions } = packageMeta;
        const versionsText = versions.map((version) => version.version);
        const targetVersion = maxSatisfying(versionsText, packageDescription.resolverArgs.packageVersion);
        const versionDescription = versions.find((version) => version.version === targetVersion);
        if (!versionDescription) {
          throw new Error('Version not found');
        }
        if (versionDescription.parameters.length !== 0) {
          throw new Error('Not implemented');
        }
        return this._getPackageArtifact(versionDescription);
      })
      .then((artifact: PresPackageArtifact): PackageMetaData<PresPackageMetaOptions> => {
        const {name, parameters, integrity, version, dependencies} = artifact;
        log(`Received artifact: ${name} ${version}`);
        const nodeDependencies = dependencies.dependencies!!;
        return {
          dependencies: nodeDependencies,
          name,
          options: {
            integrity,
            parameters,
          },
          version,
        };
      });
  }

  public parseDependencyItem(dependencyKey: string, dependencyDescription: string): PackageDescription {
    return {
      resolverArgs: {
        packageName: dependencyKey,
        packageVersion: dependencyDescription,
      },
      resolverName: this._resolverName,
      semVersion: dependencyDescription,
    };
  }

  private readonly _getPublicKey = (): Promise<Key> => {
    return Promise.resolve(fs.readFile(this._publicKeyFile))
      .then((fileContent) => key.readArmored(fileContent))
      .then(({ keys }) => {
        if (keys.length !== 1) {
          throw new Error(`Wrong keys number ${keys.length}`);
        }
        return keys[0];
      });
  }

  private _getPackageMeta(packageName: string): Promise<PresPackageMeta> {
    if (!has(this._packageMetaCache, packageName)) {
      this._packageMetaCache[packageName] = this._packageMetaResolveLimit
        .acquire(() => this._makeApiCall(`${this._repositoryURL}/artifact/metadata/${packageName}`));
    }
    return this._packageMetaCache[packageName];
  }

  private _getPackageArtifact(packageVersionDescription: PresPackageVersionDescription): Promise<PresPackageArtifact> {
    const { version, name } = packageVersionDescription;
    const cacheKey = `${name}#${version}`;
    if (!has(this._packageArtifactCache, cacheKey)) {
      this._packageArtifactCache[cacheKey] = this._packageArtifactResolveLimit
        .acquire(() => this._makeApiCall(`${this._repositoryURL}/artifact/metadata/${name}/${version}`));
    }
    return this._packageArtifactCache[cacheKey];
  }

  private _makeApiCall(url: string): Promise<any> {
    return Promise.resolve(get(url))
      .then((text: string) => JSON.parse(text))
      .then((message: PresSignedMessage) => this._verifyApiMessage(message));
  }

  private _verifyApiMessage(message: PresSignedMessage): Promise<any> {
    return this._getPublicKey()
      .then((publicKey: Key) => {
        return verifyJson(message.payload, message.signature, publicKey).then((verified) => {
          if (!verified) {
            throw new Error('unverified message received');
          }
          return message.payload;
        });
      });
  }
}
