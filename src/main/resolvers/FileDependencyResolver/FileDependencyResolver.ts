import Promise from 'bluebird';
import concatStreamFactory from 'concat-stream';
import fs from 'fs-extra';
import gunzip from 'gunzip-maybe';
import { get } from 'lodash';
import {extract} from 'tar-fs';
import { extract as extractFactory, Headers } from 'tar-stream';

import {DepTreeNode} from '../../utils/DepTreeNode';
import {PackageDescription} from '../../utils/package/PackageDescription';
import {normalizePath} from '../../utils/PathUtils';
import {DependencyResolver, PackageMetaData} from '../DependencyResolver';
import ReadableStream = NodeJS.ReadableStream;

export interface FileResolverOptions {
  name: string;
  basePath: string;
  depProperties: string[];
}

export interface FileResolverArgs {
  filePath: string;
  moduleName: string;
}

function skipStream(stream: any, next: any) {
  stream.on('end', () => {
    next();
  });
  stream.resume();
}

export class FileDependencyResolver implements DependencyResolver {
  public static DEV_DEP_PROPERTIES = ['dependencies', 'devDependencies'];
  private readonly _name: string;
  private readonly _basePath: string;
  private readonly _depProperties: string[];
  constructor({ name, basePath, depProperties }: FileResolverOptions) {
    this._name = name;
    this._basePath = basePath;
    this._depProperties = depProperties;
  }
  public extract(targetFolder: string, node: DepTreeNode): Promise<void> {
    return new Promise((res, rej) => {
      fs.createReadStream(this._getPath(node.options.filePath))
        .on('error', rej)
        .pipe(gunzip())
        .on('error', rej)
        .pipe(extract(targetFolder))
        .on('error', rej)
        .on('finish', () => {
          res();
        });
    });
  }
  public getMetaData(packageDescription: PackageDescription<FileResolverArgs>): Promise<PackageMetaData> {
    const { resolverArgs } = packageDescription;
    const meta: PackageMetaData = {
      dependencies: {},
      name: resolverArgs.moduleName,
      options: {
        // TODO calculate integrity and left it here to check during extract
        filePath: resolverArgs.filePath,
      },
      version: '1.0.0',
    };
    return this._extractPackageInfo(fs.createReadStream(this._getPath(resolverArgs.filePath)))
      .then((packageInfo: any) => {
        meta.dependencies = this._depProperties.reduce((acc: PackageMetaData['dependencies'], item: string) => {
          return Object.assign({}, acc, get(packageInfo, item, {}));
        }, {} as PackageMetaData['dependencies']);
        return Promise.resolve(meta);
      });
  }
  public parseDependencyItem(
    dependencyKey: string,
    dependencyDescription: string): PackageDescription<FileResolverArgs> {
    return {
      resolverArgs: {
        filePath: dependencyDescription,
        moduleName: dependencyKey,
      },
      resolverName: this._name,
    };
  }
  private _extractPackageInfo(archiveStream: ReadableStream): Promise<any> {
    return new Promise((res, rej) => {
      const extractStream = extractFactory();
      let packageInfo: any = null;

      extractStream.on('entry', (header: Headers, stream, next) => {
        if (header.name !== 'package.json' || header.type !== 'file') {
          skipStream(stream, next);
          return;
        }
        const concatStream = concatStreamFactory((buffer) => {
          try {
            packageInfo = JSON.parse(buffer.toString());
          } catch (e) {
            rej(e);
          }
          next();
        });
        stream.pipe(concatStream);
      });

      extractStream.on('error', (e: any) => {
        rej(e);
      });

      extractStream.on('finish', () => {
        if (packageInfo === null) {
          rej(new Error('No packageInfo found'));
          return;
        }
        res(packageInfo);
      });

      archiveStream
        .pipe(gunzip())
        .pipe(extractStream);
    });
  }
  private _getPath(relativePath: string): string {
    return normalizePath(this._basePath, relativePath);
  }
}
