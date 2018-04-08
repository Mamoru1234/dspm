import Promise from 'bluebird';
import {createReadStream, createWriteStream, existsSync} from 'fs';
import {has} from 'lodash';
import {join} from 'path';
import {AutoReleaseSemaphore} from '../utils/Semaphore';
import {ContentCache} from './ContentCache';

export class FSContentCache implements ContentCache {
  // FIXME implement file locks
  private _locks: {[key: string]: AutoReleaseSemaphore} = {};

  constructor(private _cacheDir: string) {}

  public hasItem(itemKey: string): Promise<boolean> {
    return Promise.resolve(existsSync(this._getItemPath(itemKey)));
  }

  public getItem(itemKey: string): Promise<NodeJS.ReadableStream> {
    if (has(this._locks, itemKey)) {
      return this._locks[itemKey].acquire(() => {
        return Promise.resolve(createReadStream(this._getItemPath(itemKey)));
      });
    }
    return Promise.resolve(createReadStream(this._getItemPath(itemKey)));
  }

  public setItem(itemKey: string): Promise<NodeJS.WritableStream> {
    if (has(this._locks, itemKey)) {
      throw new Error('How you get to this path?');
    }
    this._locks[itemKey] = new AutoReleaseSemaphore(1);
    const writeStream = createWriteStream(this._getItemPath(itemKey));
    this._locks[itemKey].acquire(() => new Promise((res) => {
      writeStream.on('finish', () => {
        res();
      });
    }));
    return Promise.resolve(writeStream);
  }

  private _getItemPath(itemKey: string): string {
    return join(this._cacheDir, itemKey.replace('/', '%2F'));
  }
}
