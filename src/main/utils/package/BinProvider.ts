import Promise from 'bluebird';
import {chmodSync, constants, symlink} from 'fs';
import {get, noop, once} from 'lodash';
import mkdirp from 'mkdirp';
import {join} from 'path';
import {log} from 'util';
import {DependencyResolver} from '../../resolvers/DependencyResolver';
import {executeCommand} from '../CmdUtils';
import {DepTreeNode} from '../DepTreeNode';

/*
* TODO
* consider https://github.com/npm/cmd-shim for win support
* TODO
* provide better name
* */

const symLinkAsync = Promise.promisify(symlink);

export class BinProvider {
  private _createBinFolder: () => void;

  constructor(private _binPath: string) {
    this._createBinFolder = once(() => {
      mkdirp.sync(_binPath);
    });
  }

  public extractNode(
    targetPath: string,
    node: DepTreeNode,
    resolver: DependencyResolver,
  ) {
    if (!node.packageName || !node.packageVersion || !node.resolvedBy) {
      return Promise.resolve(null);
    }
    let chain: Promise<any> = Promise.resolve();
    const scripts = get(node, 'options.scripts');
    chain = this._addToChain(targetPath, chain, scripts, 'preinstall');
    chain = chain.then(() => resolver.extract(targetPath, node));
    chain = this._addToChain(targetPath, chain, scripts, 'install');
    chain = chain.then((folder) => {
      return this._provideBinLinks(folder, node).then(() => folder);
    });
    return chain;
  }

  private _provideBinLinks(distFolder: string, node: DepTreeNode): Promise<void> {
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

  private _addToChain(targetPath: string, chain: Promise<any>, scripts: any, scriptName: string) {
    if (scripts === undefined) {
      return chain;
    }

    const command = scripts[scriptName];

    if (command === undefined) {
      return chain;
    }

    return chain.then((value) => {
      return executeCommand(command, { cwd: value || targetPath }).then(() => value);
    });
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
