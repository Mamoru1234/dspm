import merge from 'lodash/merge';
import {homedir} from 'os';
import {join} from 'path';

import {FSLockProvider} from '../caches/FSLockProvider';
import {Project} from '../Project';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';
import {createInstallTask} from '../tasks/InstallTask';

export function applyJSProjectPlugin(project: Project) {
  const cachePath = project.getProperty('cache:path', join(homedir(), '.cache', 'dspm'));
  const resolver = new NpmDependencyResolver(cachePath);
  const resolvers = project.ensureNameSpace('resolvers');
  resolvers.setItem('default', resolver);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('default', new FSLockProvider(join(project.getProjectPath(), 'dspm.lock.json')));

  const packageJson = require(join(project.getProjectPath(), 'package.json'));
  const dependencies = merge({}, packageJson.dependencies, packageJson.devDependencies);

  createInstallTask(project, 'install', (task) => task
    .dependencies('default', dependencies),
  );
}
