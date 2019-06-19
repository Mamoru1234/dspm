import Promise from 'bluebird';
import log4js from 'log4js';
import { render } from 'mustache';
import { basename, join } from 'path';
import {Project} from '../Project';
import {Task} from '../Task';
import {copyAsync, readFileAsync, writeFileAsync} from '../utils/AsyncFsUtils';
import {normalizePath} from '../utils/PathUtils';

const logger = log4js.getLogger('tasks/CopyTask');

export class CopyTask extends Task {
  public static create(project: Project, name: string): CopyTask {
    const task = new CopyTask(name, project);
    project.setTask(name, task);
    return task;
  }

  private _fromPaths: string[] = [];
  private _fromFiles: {[path: string]: any} = {};
  private _templateOptions: {[filePath: string]: any} = {};
  private _targetPath: string = '';

  public from(source: string): this {
    this._fromPaths.push(normalizePath(this.project.getProjectPath(), source));
    return this;
  }

  public fromFile(source: string, options?: any): this {
    const filePath = normalizePath(this.project.getProjectPath(), source);
    this._fromFiles[filePath] = options;
    this._templateOptions[filePath] = options;
    return this;
  }

  public into(targetPath: string): this {
    this._targetPath = normalizePath(this.project.getProjectPath(), targetPath);
    return this;
  }

  public exec(): Promise<any> {
    if (this._fromPaths.length === 0) {
      throw new Error(`You should specify from path`);
    }
    if (!this._targetPath) {
      throw new Error(`You should specify target path`);
    }
    return Promise.mapSeries(this._fromPaths, (path: string) => {
      logger.info(`Copying ${path} into ${this._targetPath}`);
      return copyAsync(path, this._targetPath);
    })
      .then(() => {
        return Promise.mapSeries(Object.keys(this._fromFiles), (file: string): any => {
          logger.info(`Copying file ${file} into ${this._targetPath}`);
          const fileName = basename(file);
          if (this._fromFiles[file]) {
            logger.info(`Processing file ${file} as template`);
            return readFileAsync(file)
              .then((content) => {
                const templateOption = this._fromFiles[file];
                const resolvedOptions = typeof templateOption === 'function'
                  ? templateOption()
                  : templateOption;
                return render(content.toString(), resolvedOptions);
              })
              .then((content) => {
                return writeFileAsync(join(this._targetPath, fileName), content);
              });
          }
          return copyAsync(file, join(this._targetPath, fileName));
        });
      });
  }
}
