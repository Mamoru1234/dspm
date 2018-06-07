import Promise from 'bluebird';
import fs from 'fs';
import {join} from 'path';
import tar, {PackOptions} from 'tar-fs';
import {createGzip} from 'zlib';
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

  private _transformFactory: (stream: any) => any;

  constructor(name: string, project: Project) {
    super(name, project);
    this._transformFactory = (stream) => stream;
  }

  public from(sourceFolder: string, options?: PackOptions): this {
    this._packItems.push({
      options,
      sourceFolder: join(this.project.getProjectPath(), sourceFolder),
    });
    return this;
  }

  public into(targetPath: string): this {
    this._targetPath = join(this.project.getProjectPath(), targetPath);
    return this;
  }

  public useGzip(): this {
    this._transformFactory = (stream) => {
      const zip = createGzip();
      zip.pipe(stream);
      return zip;
    };
    return this;
  }

  public exec(): Promise<any> {
    if (!this._targetPath) {
      throw new Error(`You should specify correct target path`);
    }
    const targetStream = this._transformFactory(fs.createWriteStream(this._targetPath));
    return new Promise<any>((res, rej) => {
      targetStream.on('error', (err: any) => {
        rej(err);
      });
      targetStream.on('finish', () => {
        res();
      });
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
      tar.pack(packItem.sourceFolder, opts).pipe(targetStream);
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
