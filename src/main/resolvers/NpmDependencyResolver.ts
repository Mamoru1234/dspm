import Promise from 'bluebird';
import gunzip from 'gunzip-maybe';
import { has } from 'lodash';
import { sync as mkDirSync } from 'mkdirp';
import { join } from 'path';
import { get as originalGet } from 'request';
import { get } from 'request-promise';
import {maxSatisfying} from 'semver';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {ContentCache} from '../caches/ContentCache';
import {FSContentCache} from '../caches/FSContentCache';
import {ChainedWriteStream} from '../streams/ChainedWriteStream';
import {DepTreeNode} from '../utils/DepTreeNode';
import {PackageDescription} from '../utils/package/PackageDescription';
import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from './DependencyResolver';
import ReadableStream = NodeJS.ReadableStream;

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
  header.name = header.name.slice(8);
  return header;
};

export class NpmDependencyResolver implements DependencyResolver {
  private _networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(32);
  private _fileLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
  private readonly _modulesCache?: ContentCache;
  private _packageRequests: any = {};

  constructor(
    private _resolverName: string,
    _cacheFolder: string,
    private repositoryURL: string = 'https://registry.npmjs.org') {
    if (_cacheFolder !== 'null') {
      const _dirPath = join(_cacheFolder, repositoryURL.replace(/\//g, '%2f'));
      mkDirSync(_dirPath);
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

  public extract(targetFolder: string, node: DepTreeNode): Promise<string> {
    return this._fileLock.acquire(() => {
      const itemKey = `${node.packageName}#${node.packageVersion}`;
      const distFolder = join(targetFolder, node.packageName!!);
      if (!this._modulesCache) {
        return this.__extractFromRegistry(distFolder, node);
      }
      return this._modulesCache.hasItem(itemKey)
        .then((isInCache) => {
          log(`${node.packageName} [${node.packageVersion}] in cache: ${isInCache}`);
          if (!isInCache) {
            return this.__extractFromRegistry(distFolder, node);
          }
          return this._modulesCache!!.getItem(itemKey).then((stream) => {
            return this.__extract(distFolder, stream);
          });
        });
    });
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
    let moduleStream: any = originalGet(node.options.dist.tarball);

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
    log(`Get Metadata: ${packageName}[${packageDescription}]`);
    return this.__getPackageData(packageName).then((res: any) => {
      const response = JSON.parse(res);
      // TODO handle latest version
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
    const request = get(`${this.repositoryURL}/${_packageName}`);
    this._packageRequests[packageName] = request;
    return request;
  }
}
