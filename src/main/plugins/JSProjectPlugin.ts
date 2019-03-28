import forEach from 'lodash/forEach';
import merge from 'lodash/merge';
import {homedir} from 'os';
import {join} from 'path';
import {log} from 'util';

import {FSLockProvider} from '../caches/FSLockProvider';
import {Project} from '../Project';
import {FileDependencyResolver} from '../resolvers/FileDependencyResolver';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';
import {CleanTask} from '../tasks/CleanTask';
import {InstallTask} from '../tasks/InstallTask';
import {NpmScriptTask} from '../tasks/NpmScriptTask';

export function applyJSProjectPlugin(project: Project) {
  log(project.getProperty('cache:path'));
  const cachePath = project.getProperty('cache:path', join(homedir(), '.cache', 'dspm'));
  const npmDependencyResolver = new NpmDependencyResolver({
    cacheFolder: cachePath,
    resolverName: 'npm',
    token: project.getProperty('npm:token'),
  });
  const fileResolver = new FileDependencyResolver({
    basePath: project.getProjectPath(),
    depProperties: FileDependencyResolver.DEV_DEP_PROPERTIES,
    name: 'file',
  });
  const resolvers = project.ensureNameSpace('resolvers');
  resolvers.setItem('npm', npmDependencyResolver);
  resolvers.setItem('file', fileResolver);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('default', new FSLockProvider(join(project.getProjectPath(), 'dspm.lock.json')));

  const packageJson = require(join(project.getProjectPath(), 'package.json'));
  const dependencies = merge({}, packageJson.dependencies, packageJson.devDependencies);

  InstallTask.create(project, 'install')
    .dependencies(dependencies);

  CleanTask.create(project, 'clean')
    .clean('build');

  forEach(packageJson.scripts, (command: string, scriptName: string) => {
    NpmScriptTask.create(project, scriptName)
      .command(command);
  });
}
