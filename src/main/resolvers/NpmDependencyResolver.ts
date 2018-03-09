import gunzip from 'gunzip-maybe';
import { sync as mkDirSync } from 'mkdirp';
import { join } from 'path';
import { get as originalGet } from 'request';
import { get } from 'request-promise';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {ContentCache} from '../caches/ContentCache';
import {FSContentCache} from '../caches/FSContentCache';
import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from './DependencyResolver';
import ReadableStream = NodeJS.ReadableStream;

// to avoid package/ prefix
const mapNpmTarHeader = (header: Headers) => {
  header.name = header.name.slice(8);
  return header;
};

export class NpmDependencyResolver implements DependencyResolver {
  private networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
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

  public extract(targetFolder: string, metaData: PackageMetaData): Promise<string> {
    return this.fileLock.acquire(() => {
      const itemKey = `${metaData.name}#${metaData.version}`;
      const distFolder = join(targetFolder, metaData.name);
      if (!this._modulesCache) {
        return this.__extractFromRegistry(distFolder, metaData);
      }
      return this._modulesCache.hasItem(itemKey)
        .then((isInCache) => {
          log(`${metaData.name} [${metaData.version}] in cache: ${isInCache}`);
          if (!isInCache) {
            return this.__extractFromRegistry(distFolder, metaData);
          }
          return this.__extract(distFolder, this._modulesCache!!.getItem(itemKey));
        });
    });
  }

  public getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    return this.networkLock.acquire(() => {
      return this.__getMetaData(packageName, packageDescription);
    });
  }

  private __extractFromRegistry(distFolder: string, metaData: PackageMetaData): Promise<string> {

    const itemKey = `${metaData.name}#${metaData.version}`;
    const moduleStream = originalGet(metaData.options.dist.tarball);

    if (this._modulesCache) {
      moduleStream.pipe(this._modulesCache.setItem(itemKey));
    }

    return this.__extract(distFolder, moduleStream as any);
  }

  private __extract(distFolder: string, moduleStream: ReadableStream): Promise<string> {
    return new Promise((res, rej) => {
      moduleStream
        .pipe(gunzip())
        .pipe(extract(distFolder, { map: mapNpmTarHeader }))
        .on('error', (err: any) => {
          rej(err);
        })
        .on('finish', () => {
          res(distFolder);
        });
    });
  }

  private __getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    log(packageName);
    const _packageName = packageName.replace('/', '%2F');
    return get(`${this.repositoryURL}/${_packageName}/${packageDescription}`).then((res) => {
      const response = JSON.parse(res);
      return {
        dependencies: response.dependencies,
        name: response.name,
        options: {
          dist: response.dist,
        },
        version: response.version,
      };
    }) as any;
  }
}
