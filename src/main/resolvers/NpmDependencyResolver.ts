import { get } from 'request-promise';
import { get as originalGet } from 'request';
import {log} from "util";
import { join } from 'path';
import {extract, Headers} from 'tar-fs';
import gunzip from 'gunzip-maybe';
import {DependencyResolver, PackageMetaData} from "./DependencyResolver";
import {AutoReleaseSemaphore} from "../utils/Semaphore";

// to avoid package/
const mapNpmTarHeader = (header: Headers) => {
  header.name = header.name.slice(8);
  return header;
};

export class NpmDependencyResolver implements DependencyResolver {
  private networkLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);
  private fileLock: AutoReleaseSemaphore = new AutoReleaseSemaphore(16);

  constructor(private repositoryURL: string = 'https://registry.npmjs.org') {}

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
        })
    });
  }

  public extract(targetFolder: string, metaData: PackageMetaData): Promise<string> {
    return this.fileLock.acquire(() => {
      return this.__extract(targetFolder, metaData);
    });
  }

  private __getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    log(packageName);
    log('');
    return get(`${this.repositoryURL}/${packageName}/${packageDescription}`).then((res) => {
      const response = JSON.parse(res);
      return {
        name: response.name,
        version: response.version,
        dependencies: response.dependencies,
        options: {
          dist: response.dist
        }
      }
    }) as any
  }

  public getMetaData(packageName: string, packageDescription: string): Promise<PackageMetaData> {
    return this.networkLock.acquire(() => {
      return this.__getMetaData(packageName, packageDescription);
    });
  }
}