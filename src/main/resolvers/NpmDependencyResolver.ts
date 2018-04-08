import Promise from 'bluebird';
import gunzip from 'gunzip-maybe';
import { sync as mkDirSync } from 'mkdirp';
import { join } from 'path';
import { get as originalGet } from 'request';
import { get } from 'request-promise';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {ContentCache} from '../caches/ContentCache';
import {FSContentCache} from '../caches/FSContentCache';
import {ChainedWriteStream} from '../streams/ChainedWriteStream';
import {DepTreeNode} from '../utils/DepTreeNode';
import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from './DependencyResolver';
import ReadableStream = NodeJS.ReadableStream;

// temporal fix caused by bug in npm registry which is related to scoped packages
const encodePackagePart = (packageName: string, packageDescription: string) => {
  const charCode = packageDescription.charCodeAt(0);
  const _packageName = packageName.replace('/', '%2F');
  if (_packageName[0] === '@' && charCode > 47 && charCode < 58) {
    return `${_packageName}/=${packageDescription}`;
  }
  return `${_packageName}/${packageDescription}`;
};

// needed to avoid package/ prefix
const mapNpmTarHeader = (header: Headers) => {
  header.name = header.name.slice(8);
  return header;
};

export class NpmDependencyResolver implements DependencyResolver {
  private networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(32);
  private fileLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
  private _modulesCache?: ContentCache;

  constructor(
    _cacheFolder: string,
    private repositoryURL: string = 'https://registry.npmjs.org') {
    if (_cacheFolder !== 'null') {
      const _dirPath = join(_cacheFolder, repositoryURL.replace(/\//g, '%2f'));
      mkDirSync(_dirPath);
      this._modulesCache = new FSContentCache(_dirPath);
    }
  }

  public extract(targetFolder: string, node: DepTreeNode): Promise<string> {
    return this.fileLock.acquire(() => {
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

  public getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    return this.networkLock.acquire(() => {
      return this.__getMetaData(packageName, packageDescription);
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
    return get(`${this.repositoryURL}/${encodePackagePart(packageName, packageDescription)}`).then((res) => {
      const response = JSON.parse(res);
      return {
        dependencies: response.dependencies,
        name: response.name,
        options: {
          bin: response.bin,
          dist: response.dist,
          scripts: response.scripts,
        },
        version: response.version,
      };
    }) as any;
  }
}
