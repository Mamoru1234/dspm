import Promise from 'bluebird';
import {chmodSync, constants, ensureDir, symlink} from 'fs-extra';
import {get, noop, once} from 'lodash';
import {join} from 'path';
import {log} from 'util';

import {Namespace} from '../Namespace';
import {DependencyResolver} from '../resolvers/DependencyResolver';
import {executeCommand} from './CmdUtils';
import {DepTreeNode} from './DepTreeNode';
import {breadTraversal, deepTraversal} from './DepTreeUtils';

const symLinkAsync = Promise.promisify(symlink);
const ensureDirAsync = Promise.promisify(ensureDir);

interface NodeContext {
  parentPath: string;
}

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
    return deepTraversal(root, this._installNode.bind(this), { parentPath: this._targetPath})
      .tap(() => {
        log('Install phase completed');
      })
      .then(() => breadTraversal(root, this._modulePrefix, this._targetPath, this._provideBinLinks.bind(this)))
      .then(() => breadTraversal(root, this._modulePrefix, this._targetPath, this._postInstallNode.bind(this)));
  }
  private _installNode(node: DepTreeNode, { parentPath }: NodeContext): Promise<any> {
    if (!node.packageName || !node.packageVersion || !node.resolvedBy) {
      return Promise.resolve(null);
    }
    log(`Installing node for parent: ${parentPath} ${node.packageName}`);
    const resolver = this._resolvers.getItem(node.resolvedBy);
    if (!resolver) {
      // tslint:disable-next-line
      console.log(node);
      throw new Error('No resolver found for node!');
    }
    const packageName = node.packageName;
    const scripts = get(node, 'options.scripts');
    // TODO mkdirp here, refactor extract
    const modulePath = join(parentPath, this._modulePrefix, packageName);
    return ensureDirAsync(modulePath)
      .then(() => this._executeScript(parentPath, scripts, 'preinstall'))
      .then(() => resolver.extract(modulePath, node))
      .then(() => ({
        parentPath: modulePath,
      }));
  }
  private _postInstallNode(node: DepTreeNode, modulePath: string): Promise<any> {
    const scripts = get(node, 'options.scripts');
    return this._executeScript(modulePath, scripts, 'install');
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
  private _provideBinLinks(node: DepTreeNode, modulePath: string): Promise<void> {
    const {bin} = node.options;

    if (!bin) {
      return Promise.resolve();
    }

    const binPath = join(modulePath, '../.bin');

    if (typeof bin === 'string') {
      const linkPath = join(modulePath, bin);
      return this._createBinFolder()
        .then(() => this._createBinLink(binPath, node.packageName!!, linkPath))
        .then(noop);
    }

    if (typeof bin === 'object') {
      return this._createBinFolder()
        .then(() => Promise
          .map(Object.keys(bin), (binKey: string) => {
            const linkPath = join(modulePath, bin[binKey]);
            return this._createBinLink(binPath, binKey, linkPath);
          }))
        .then(noop);
    }

    return Promise.reject('Unknown bin links creation error');
  }
  private _createBinLink(binPath: string, binKey: string, linkPath: string) {
    log(`Linking: [${binKey}]: ${linkPath} into ${binPath}`);
    const targetLink = join(this._binPath, binKey);
    return ensureDirAsync(binPath)
      .then(() => symLinkAsync(linkPath, targetLink))
      .then(() => {
        // tslint:disable-next-line
        chmodSync(linkPath, constants.S_IXUSR | constants.S_IRUSR);
      });
  }
}
