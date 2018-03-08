import noop from 'lodash/noop';

import {createDepTask} from '../DependencyTask';
import {Project} from '../Project';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';

export function applyJSProjectPlugin(project: Project) {
  const resolver = new NpmDependencyResolver();
  createDepTask(project, 'install', {npm: resolver}, noop);
}
