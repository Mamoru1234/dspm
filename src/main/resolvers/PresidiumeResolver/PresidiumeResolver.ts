import Promise from 'bluebird';
import fs from 'fs-extra';
import gunzip from 'gunzip-maybe';
import {has, once} from 'lodash';
import {key} from 'openpgp';
import {get as getStream} from 'request';
import {get} from 'request-promise';
import {maxSatisfying} from 'semver';
import {pipeline} from 'stream';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {rimrafAsync} from '../../utils/AsyncFsUtils';
import {DepTreeNode} from '../../utils/DepTreeNode';
import {PackageDescription} from '../../utils/package/PackageDescription';
import {AutoReleaseSemaphore} from '../../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from '../DependencyResolver';
import {verifyJson} from './OpenPgpUtils';
import {resolveParams} from './ParametersResolver';
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
import Timeout = NodeJS.Timeout;
import {createIntegrityStream, createSizeValidationStream} from './PresValidationStreamUtils';

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
  private readonly _requestTimeout: number;
  private readonly _packageSizeLimit: number;
  private _packageMetaCache: {[key: string]: Promise<PresPackageMeta>} = {};
  private _packageArtifactCache: {[key: string]: Promise<PresPackageArtifact>} = {};
  private _packageMetaResolveLimit = new AutoReleaseSemaphore(10);
  private _packageArtifactResolveLimit = new AutoReleaseSemaphore(10);
  constructor({
    resolverName,
    repositoryUrl,
    publicKeyFile,
    requestTimeout,
    packageSizeLimit,
  }: PresidiumeResolverOptions) {
    this._repositoryURL = repositoryUrl;
    this._resolverName = resolverName;
    this._publicKeyFile = publicKeyFile;
    this._requestTimeout = requestTimeout;
    this._packageSizeLimit = packageSizeLimit * 1024; // transform into kb
    this._getPublicKey = once(this._getPublicKey);
  }

  public extract(targetFolder: string, depTreeNode: DepTreeNode<PresPackageMetaOptions>): Promise<void> {
    return new Promise<void>((res, rej) => {
      const { packageName, packageVersion, options } = depTreeNode;
      const url = `${this._repositoryURL}/artifact/download/${packageName}/${packageVersion}`;
      const moduleStream = getStream({
        qs: options!!.parameters,
        url,
      });
      const tempPipe = pipeline as any;
      const timeout = setTimeout(() => {
        moduleStream.emit('error', `Request timout ${url}`);
        moduleStream.abort();
      }, this._requestTimeout);
      const details = `${packageName} [${packageVersion}]`;
      const integrity = createIntegrityStream(options!!.integrity, details);
      const extractStream = extract(targetFolder, { map: mapNpmTarHeader });
      const sizeStream = createSizeValidationStream(this._packageSizeLimit, details);
      tempPipe(moduleStream, sizeStream, integrity, gunzip(), extractStream, (err: Error) => {
        clearTimeout(timeout);
        if (err) {
          log('Pres extract pipeline error: ' + JSON.stringify(err));
          rej(err);
          return;
        }
        res();
      });
    }).catch((e: any) => {
      return rimrafAsync(targetFolder).then(() => {
        throw e;
      });
    });
  }

  public getMetaData(packageDescription: PackageDescription<PresidiumeResolverArgs>): Promise<PackageMetaData> {
    return this._getPackageMeta(packageDescription.resolverArgs.packageName)
      .then((packageMeta: PresPackageMeta) => {
        log('Received meta: ' + packageMeta.name);
        log('Resolving description: ' + JSON.stringify(packageDescription));
        const { versions } = packageMeta;
        const versionsText = versions.map((version) => version.version);
        const targetVersion = maxSatisfying(versionsText, packageDescription.resolverArgs.packageVersion);
        const versionDescription = versions.find((version) => version.version === targetVersion);
        if (versions.length === 0) {
          throw new Error(`Pre build is not supported for package ${packageMeta.name}`);
        }
        if (!versionDescription) {
          throw new Error(`Version not found ${packageMeta.name} ${targetVersion}`);
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
      const url = `${this._repositoryURL}/artifact/metadata/${name}/${version}`;
      this._packageArtifactCache[cacheKey] = this._packageArtifactResolveLimit
        .acquire(() => this._makeApiCall(url, resolveParams(packageVersionDescription.parameters)));
    }
    return this._packageArtifactCache[cacheKey];
  }

  private _makeApiCall(url: string, queryObject?: any): Promise<any> {
    let timeout: Timeout = null as any;
    const requestCall = new Promise<string>((res, rej) => {
      const options: any = {
        url,
      };
      if (queryObject) {
        options.qs = queryObject;
      }
      const tRequest = get(options);
      tRequest.then(res).catch(rej);
      timeout = setTimeout(() => {
        tRequest.abort();
        rej(`Request aborted ${url}`);
      }, this._requestTimeout); // FIXME introduce parameter
    });
    return requestCall
      .then((text: string) => {
        clearTimeout(timeout);
        return JSON.parse(text);
      })
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
