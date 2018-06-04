import Promise from 'bluebird';
import fs from 'fs';
import tar, {PackOptions} from 'tar-fs';
import {log} from 'util';
import {Project} from '../Project';
import {Task} from '../Task';

interface PackItem {
  sourceFolder: string;
  options?: PackOptions;
}

export class ArchiveTask extends Task {

  public static create(
    project: Project,
    name: string,
  ): ArchiveTask {
    const task = new ArchiveTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _packItems: PackItem[] = [];

  private _targetPath: string = '';

  public from(sourceFolder: string, options?: PackOptions): this {
    this._packItems.push({
      options,
      sourceFolder,
    });
    return this;
  }

  public into(targetPath: string): this {
    this._targetPath = targetPath;
    return this;
  }

  public exec(): Promise<any> {
    if (!this._targetPath) {
      throw new Error(`You should specify correct target path`);
    }
    log(`Packaging: ${JSON.stringify(this._packItems)}`);
    const targetStream = fs.createWriteStream(this._targetPath);
    return new Promise<any>((res, rej) => {
      setImmediate(() => {
        const packItem = this._packItems.shift();
        if (!packItem) {
          rej('No pack item specified');
          return;
        }
        const opts = Object.assign({}, packItem.options, {
          finalize: !this._packItems.length,
          finish: (newPack: any) => {
            setImmediate(() => {
              this._pullPackQueue(newPack);
            });
          },
        });
        log(`Initial opts: ${JSON.stringify(opts, null, 2)}`);
        tar.pack(packItem.sourceFolder, opts).pipe(targetStream);
      });
      targetStream.on('error', (err) => {
        rej(err);
      });
      targetStream.on('finish', () => {
        res();
      });
    });
  }

  private _pullPackQueue(pack: any) {
    const packItem = this._packItems.shift();
    if (!packItem) {
      return;
    }
    tar.pack(packItem.sourceFolder, Object.assign({}, packItem.options, {
      finalize: !this._packItems.length,
      finish: (newPack: any) => {
        setImmediate(() => {
          this._pullPackQueue(newPack);
        });
      },
      pack,
    }));
  }
}
