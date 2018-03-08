import gunzip from 'gunzip-maybe';
import { join } from 'path';
import { get as originalGet } from 'request';
import { get } from 'request-promise';
import {extract, Headers} from 'tar-fs';
import {log} from 'util';

import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from './DependencyResolver';

// to avoid package/
const mapNpmTarHeader = (header: Headers) => {
  header.name = header.name.slice(8);
  return header;
};

export class NpmDependencyResolver implements DependencyResolver {
  private networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
  private fileLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);

  constructor(private repositoryURL: string = 'https://registry.npmjs.org') {}

  public extract(targetFolder: string, metaData: PackageMetaData): Promise<string> {
    return this.fileLock.acquire(() => {
      return this.__extract(targetFolder, metaData);
    });
  }

  public getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    return this.networkLock.acquire(() => {
      return this.__getMetaData(packageName, packageDescription);
    });
  }

  private __extract(targetFolder: string, metaData: PackageMetaData): Promise<string> {
    const distFolder = join(targetFolder, metaData.name);
    return new Promise((res, rej) => {
      originalGet(metaData.options.dist.tarball)
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
    log('');
    return get(`${this.repositoryURL}/${packageName}/${packageDescription}`).then((res) => {
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
