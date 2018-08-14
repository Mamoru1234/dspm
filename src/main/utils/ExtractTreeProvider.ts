import Promise from 'bluebird';
import {chmodSync, constants, ensureDir, symlink} from 'fs-extra';
import {get, map, noop, once} from 'lodash';
import {join} from 'path';
import {log} from 'util';

import {Namespace} from '../Namespace';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {executeCommand} from './CmdUtils';
import {DepTreeNode} from './DepTreeNode';

const symLinkAsync = Promise.promisify(symlink);
const ensureDirAsync = Promise.promisify(ensureDir);

export class ExtractTreeProvider {
  private _binPath: string;
  private _executionPath: string;
  private _createBinFolder: () => Promise<any>;

  constructor(
    /*private _project: Project,*/
    private _targetPath: string,
    private _modulePrefix: string,
    private _resolvers: Namespace<DependencyResolver>,
  ) {
    this._binPath = join(_targetPath, _modulePrefix, '.bin');
    this._createBinFolder = once(() => {
      return ensureDirAsync(this._binPath);
    });
    this._executionPath = `${this._binPath}:${process.env.PATH}`;
  }

  public extractTree(root: DepTreeNode): Promise<any> {
    return this._installNode(root, this._targetPath)
      .tap(() => {
        log('Install phase completed');
      })
      .then(() => this._postInstallNode(root, this._targetPath));
  }

  private _installNode(node: DepTreeNode, parentPath: string): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.packageName || !child.packageVersion || !child.resolvedBy) {
        return Promise.resolve(null);
      }
      log(`Installing node for parent: ${parentPath} ${child.packageName}`);
      const resolver = this._resolvers.getItem(child.resolvedBy);
      if (!resolver) {
        // tslint:disable-next-line
        console.log(child);
        throw new Error('No resolver found for node!');
      }
      const packageName = child.packageName;
      const scripts = get(child, 'options.scripts');
      // TODO mkdirp here, refactor extract
      return this._executeScript(parentPath, scripts, 'preinstall')
        .then(() => resolver.extract(join(parentPath, this._modulePrefix), child))
        .then(() => this._installNode(child, join(parentPath, this._modulePrefix, packageName)));
    }));
  }

  private _postInstallNode(node: DepTreeNode, parentPath: string): Promise<any> {
    return Promise.all(map(node.children, (child: DepTreeNode) => {
      if (!child.packageName || !child.packageVersion || !child.resolvedBy) {
        return Promise.resolve(null);
      }
      const {packageName} = child;
      const modulePath = join(parentPath, this._modulePrefix, packageName);
      return this._postInstallNode(child, modulePath)
        .then(() => {
          const scripts = get(child, 'options.scripts');
          return this._executeScript(modulePath, scripts, 'install');
        })
        .then(() => {
          return this._provideBinLinks(modulePath, child);
        });
    }));
  }

  private _executeScript(targetPath: string, scripts: any, scriptName: string): Promise<any> {
    if (scripts === undefined) {
      return Promise.resolve();
    }

    const command = scripts[scriptName];

    if (command === undefined) {
      return Promise.resolve();
    }

    const env = Object.assign({}, process.env);
    env.PATH = this._executionPath;
    return executeCommand(command, { cwd: targetPath, env });
  }
  private _provideBinLinks(modulePath: string, node: DepTreeNode): Promise<void> {
    const {bin} = node.options;

    if (!bin) {
      return Promise.resolve();
    }

    this._createBinFolder();

    if (typeof bin === 'string') {
      const linkPath = join(modulePath, bin);
      return this._createBinLink(node.packageName!!, linkPath);
    }
    if (typeof bin === 'object') {
      return Promise
        .map(Object.keys(bin), (binKey: string) => {
          const linkPath = join(modulePath, bin[binKey]);
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
    return symLinkAsync(linkPath, targetLink, undefined)
      .then(() => {
        // tslint:disable-next-line
        chmodSync(linkPath, constants.S_IXUSR | constants.S_IRUSR);
      }, noop);
  }
}
