import Promise from 'bluebird';
import log4js from 'log4js';
import {Project} from './Project';

const logger = log4js.getLogger('main/Task');

export class Task {
  private _dependencies: Task[] = [];
  private _execution?: Promise<any>;

  constructor(
    private name: string,
    public project: Project,
  ) {
  }

  public dependsOn(task: Task | string): Task {
    if (typeof task === 'string') {
      this._dependencies.push(this.project.getTask(task));
    } else {
      this._dependencies.push(task);
    }
    return this;
  }

  public upToDate(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public execDeps(): Promise<any> {
    return Promise.all(this._dependencies.map((task) => task.run()));
  }

  public run(): Promise<any> {
    if (!this._execution) {
      this._execution = this.execDeps()
        .then(() => this.upToDate())
        .then((isUpToDate: boolean) => {
          if (isUpToDate) {
            logger.info(`${this.name} is up to date`);
            return Promise.resolve();
          }
          logger.info(`Executing ${this.name}`);
          return this.exec();
        })
        .catch((e: any) => {
          /* tslint:disable */
          logger.error('');
          logger.error('===============');
          logger.error('|||||||||||||||');
          logger.error('///////////////');
          logger.error(e);
          logger.error('');
          process.exit(-1);
          /* tslint:enable */
        });
    }
    return this._execution;
  }

  public exec(): Promise<any> {
    logger.info(`Exec: ${this.name}`);
    return Promise.resolve();
  }
}
