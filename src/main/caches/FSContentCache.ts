import Promise from 'bluebird';
import {createReadStream, createWriteStream, existsSync} from 'fs';
import {join} from 'path';
import {ContentCache} from './ContentCache';

export class FSContentCache implements ContentCache {

  constructor(private _cacheDir: string) {}

  public hasItem(itemKey: string): Promise<boolean> {
    return Promise.resolve(existsSync(this._getItemPath(itemKey)));
  }

  public getItem(itemKey: string): Promise<NodeJS.ReadableStream> {
    return Promise.resolve(createReadStream(this._getItemPath(itemKey)));
  }

  public setItem(itemKey: string): Promise<NodeJS.WritableStream> {
    return Promise.resolve(createWriteStream(this._getItemPath(itemKey)));
  }

  private _getItemPath(itemKey: string): string {
    return join(this._cacheDir, itemKey.replace('/', '%2F'));
  }
}
