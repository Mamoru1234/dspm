import noop from 'lodash/noop';

import {createDepTask} from '../DependencyTask';
import {Project} from '../Project';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';

export function applyJSProjectPlugin(project: Project) {
  const resolver = new NpmDependencyResolver();
  const resolvers = project.ensureNameSpace('resolvers');
  resolvers.setItem('default', resolver);
  createDepTask(project, 'install', noop);
}
