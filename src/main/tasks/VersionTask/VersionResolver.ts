import Promise from 'bluebird';
import {Project} from '../../Project';

export interface VersionResolver {
  getVersion(project: Project, options?: any): Promise<string>;
}
