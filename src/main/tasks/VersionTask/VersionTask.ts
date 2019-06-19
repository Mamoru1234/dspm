import Bluebird from 'bluebird';
import {Project} from '../../Project';
import {Task} from '../../Task';
import {VersionResolver} from './VersionResolver';

export class VersionTask extends Task {
  public static NAMESPACE = 'VERSION_RESOLVERS';

  public static create(
    project: Project,
    name: string,
  ): VersionTask {
    const task = new VersionTask(project, name);
    project.setTask(name, task);
    return task;
  }

  private _version: string | null = null;
  private _versionResolverName = 'git';
  private _resolverOptions: any;

  constructor(
    private _project: Project,
    name: string,
  ) {
    super(name, _project);
  }

  public versionResolver(name: string): this {
    this._versionResolverName = name;
    return this;
  }

  public options(options: any): this {
    this._resolverOptions = options;
    return this;
  }

  public getVersion(): string {
    if (!this._version) {
      throw new Error('Getting version before exec');
    }
    return this._version;
  }

  public exec(): Bluebird<any> {
    const resolver = this._project.getNamespace<VersionResolver>(VersionTask.NAMESPACE)
      .getItem(this._versionResolverName);
    return resolver.getVersion(this._project, this._resolverOptions)
      .then((version) => {
        this._version = version;
      });
  }
}
