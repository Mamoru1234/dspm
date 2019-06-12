import Promise from 'bluebird';
import { ensureDirSync } from 'fs-extra';
import gunzip from 'gunzip-maybe';
import { has, noop } from 'lodash';
import log4js from 'log4js';
import { join } from 'path';
import { get as originalGet } from 'request';
import { get } from 'request-promise';
import {maxSatisfying} from 'semver';
import {extract, Headers} from 'tar-fs';

import {ContentCache} from '../caches/ContentCache';
import {FSContentCache} from '../caches/FSContentCache';
import {ChainedWriteStream} from '../streams/ChainedWriteStream';
import {DepTreeNode} from '../utils/DepTreeNode';
import {PackageDescription} from '../utils/package/PackageDescription';
import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from './DependencyResolver';
import ReadableStream = NodeJS.ReadableStream;

const logger = log4js.getLogger('resolvers/NpmResolver');

function findInVersions(versions: any, packageDescription: string, packageName: string) {
  const keys = Object.keys(versions);
  const satisfiedVersion = maxSatisfying(keys, packageDescription);
  if (satisfiedVersion === null) {
    throw new Error(`No satisfied version for ${packageName}[${packageDescription}] in ${JSON.stringify(keys)}`);
  }
  return satisfiedVersion;
}

// needed to avoid package/ prefix
const mapNpmTarHeader = (header: Headers) => {
  const packageNameInd = header.name.indexOf('/');
  header.name = header.name.slice(packageNameInd);
  return header;
};

export interface NpmResolverOptions {
  resolverName: string;
  // token returned by https://github.com/npm/registry/blob/master/docs/user/authentication.md#login
  token?: string;
  cacheFolder?: string;
  repositoryUrl?: string;
}

export class NpmDependencyResolver implements DependencyResolver {
  private _networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(32);
  private _fileLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
  private readonly _modulesCache?: ContentCache;
  private _packageRequests: any = {};

  private readonly _resolverName: string;
  private readonly _repositoryURL: string;
  private readonly _requestOptions: any = undefined;

  constructor({
    cacheFolder = 'null',
    resolverName,
    token,
    repositoryUrl = 'https://registry.npmjs.org',
  }: NpmResolverOptions) {
    this._resolverName = resolverName;
    this._repositoryURL = repositoryUrl;
    if (token) {
      this._requestOptions = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    }
    if (cacheFolder !== 'null') {
      const _dirPath = join(cacheFolder, repositoryUrl.replace(/\//g, '%2f'));
      ensureDirSync(_dirPath);
      this._modulesCache = new FSContentCache(_dirPath);
    }
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

  public extract(targetFolder: string, node: DepTreeNode): Promise<void> {
    return this._fileLock.acquire(() => {
      const itemKey = `${node.packageName}#${node.packageVersion}`;
      if (!this._modulesCache) {
        return this.__extractFromRegistry(targetFolder, node);
      }
      return this._modulesCache.hasItem(itemKey)
        .then((isInCache) => {
          logger.info(`${node.packageName} [${node.packageVersion}] in cache: ${isInCache}`);
          if (!isInCache) {
            return this.__extractFromRegistry(targetFolder, node);
          }
          return this._modulesCache!!.getItem(itemKey).then((stream) => {
            return this.__extract(targetFolder, stream);
          });
        });
    }).then(noop);
  }

  public getMetaData(packageDescription: PackageDescription): Promise<PackageMetaData> {
    return this._networkLock.acquire(() => {
      const {
        packageName,
        packageVersion,
      } = packageDescription.resolverArgs;
      return this.__getMetaData(packageName, packageVersion);
    });
  }

  private __extractFromRegistry(distFolder: string, node: DepTreeNode): Promise<string> {

    const itemKey = `${node.packageName}#${node.packageVersion}`;
    let moduleStream: any = originalGet(node.options.dist.tarball, this._requestOptions);

    if (!this._modulesCache) {
      return this.__extract(distFolder, moduleStream);
    }

    return this._modulesCache.setItem(itemKey).then((cacheStream) => {
      moduleStream = moduleStream.pipe(new ChainedWriteStream(cacheStream));
      return this.__extract(distFolder, moduleStream);
    });
  }

  private __extract(distFolder: string, moduleStream: ReadableStream): Promise<string> {
    return new Promise((res, rej) => {
      moduleStream
        .pipe(gunzip())
        .on('error', (err: any) => {
          rej(err);
        })
        .pipe(extract(distFolder, { map: mapNpmTarHeader }))
        .on('error', (err: any) => {
          rej(err);
        })
        .on('finish', () => {
          res();
        });
    })
      .then(() => {
        return distFolder;
      });
  }

  private __getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    logger.info(`Get Metadata: ${packageName}[${packageDescription}]`);
    return this.__getPackageData(packageName).then((res: any) => {
      const response = JSON.parse(res);
      const { versions } = response;
      const satisfiedVersion = has(response['dist-tags'], packageDescription)
        ? response['dist-tags'][packageDescription]
        : findInVersions(versions, packageDescription, packageName);
      const version = versions[satisfiedVersion];
      return {
        dependencies: version.dependencies,
        name: version.name,
        options: {
          bin: version.bin,
          dist: version.dist,
          scripts: version.scripts,
        },
        version: satisfiedVersion,
      };
    });
  }

  private __getPackageData(packageName: string) {
    if (has(this._packageRequests, packageName)) {
      return this._packageRequests[packageName];
    }
    const _packageName = packageName.replace('/', '%2F');
    const request = get(`${this._repositoryURL}/${_packageName}`, this._requestOptions);
    this._packageRequests[packageName] = request;
    return request;
  }
}
