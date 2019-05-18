import Promise from 'bluebird';
import fs from 'fs-extra';
import {has, once} from 'lodash';
import {key} from 'openpgp';
import { get } from 'request-promise';

import {PackageDescription} from '../../utils/package/PackageDescription';
import {AutoReleaseSemaphore} from '../../utils/Semaphore';
import {DependencyResolver, PackageMetaData} from '../DependencyResolver';
import {verifyJson} from './OpenPgpUtils';
import {
  PresidiumeResolverArgs,
  PresidiumeResolverOptions,
  PresPackageMeta,
  PresSignedMessage,
} from './PresidiumeInterface';
import Key = key.Key;

export class PresidiumeResolver implements DependencyResolver {
  private readonly _resolverName: string;
  private readonly _repositoryURL: string;
  private readonly _publicKeyFile: string;
  private _packageMetaCache: {[key: string]: Promise<PresPackageMeta>} = {};
  private _packageMetaResolveLimit = new AutoReleaseSemaphore(10);
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

  public extract(): Promise<void> {
    throw new Error('Not implemented');
  }

  public getMetaData(packageDescription: PackageDescription<PresidiumeResolverArgs>): Promise<PackageMetaData> {
    return this._getPackageMeta(packageDescription.resolverArgs.packageName)
      .then(() => {
        throw new Error('Not implemented');
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
    if (has(this._packageMetaCache, packageName)) {
      return this._packageMetaCache[packageName];
    }
    return this._packageMetaResolveLimit
      .acquire(() => this._getPublicKey()
        .then((publicKey) => Promise.resolve(get(`${this._repositoryURL}/artifact/${packageName}`))
          .then((message: PresSignedMessage): any => [publicKey, message]))
        .then(([publicKey, message]: [Key, PresSignedMessage]) => {
          return verifyJson(message.payload, message.signature, publicKey).then((verified) => {
            if (!verified) {
              throw new Error('unverified message received');
            }
            return message.payload;
          });
        }));
  }
}
