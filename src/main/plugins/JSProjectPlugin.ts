import merge from 'lodash/merge';
import {homedir} from 'os';
import {join} from 'path';

import {createDepTask} from '../DependencyTask';
import {Project} from '../Project';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';

export function applyJSProjectPlugin(project: Project) {
  const cachePath = project.getProperty('cache:path', join(homedir(), '.cache', 'dspm'));
  const resolver = new NpmDependencyResolver(cachePath);
  const resolvers = project.ensureNameSpace('resolvers');
  resolvers.setItem('default', resolver);

  const packageJson = require(join(project.getProjectPath(), 'package.json'));
  const dependencies = merge({}, packageJson.dependencies, packageJson.devDependencies);

  createDepTask(project, 'install', (task) => task
    .dependencies('default', dependencies),
  );
}
