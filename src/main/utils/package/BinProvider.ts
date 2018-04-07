import Promise from 'bluebird';
import {chmodSync, constants, symlink} from 'fs';
import {noop, once} from 'lodash';
import mkdirp from 'mkdirp';
import {join} from 'path';
import {log} from 'util';
import {DepTreeNode} from '../DepTreeNode';

/*
* TODO
* consider https://github.com/npm/cmd-shim for win support
* */

const symLinkAsync = Promise.promisify(symlink);

export class BinProvider {
  private _createBinFolder: () => void;

  constructor(private _binPath: string) {
    this._createBinFolder = once(() => {
      mkdirp.sync(_binPath);
    });
  }

  public provideBinLinks(distFolder: string, node: DepTreeNode): Promise<void> {
    const {bin} = node.options;

    if (!bin) {
      return Promise.resolve();
    }

    this._createBinFolder();

    if (typeof bin === 'string') {
      const linkPath = join(distFolder, bin);
      return this._createBinLink(node.packageName!!, linkPath);
    }
    if (typeof bin === 'object') {
      return Promise
        .map(Object.keys(bin), (binKey: string) => {
          const linkPath = join(distFolder, bin[binKey]);
          return this._createBinLink(binKey, linkPath);
        })
        .then(noop);
    }

    return Promise.reject('Unknown bin links creation error');
  }

  // FIXME find better way to handle duplicated links error then ignoring promise error
  private _createBinLink(binKey: string, linkPath: string) {
    log(`Linking: [${binKey}]: ${linkPath}`);
    const targetLink = join(this._binPath, binKey);
    return symLinkAsync(linkPath, targetLink)
      .then(() => {
        // tslint:disable-next-line
        chmodSync(linkPath, constants.S_IXUSR | constants.S_IRUSR);
      }, noop);
  }
}
