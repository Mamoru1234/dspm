import forEach from 'lodash/forEach';
import merge from 'lodash/merge';
import {homedir} from 'os';
import {join} from 'path';

import {FSLockProvider} from '../caches/FSLockProvider';
import {Project} from '../Project';
import {FileDependencyResolver} from '../resolvers/FileDependencyResolver';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';
import {CleanTask} from '../tasks/CleanTask';
import {DependencyResolveTask} from '../tasks/DependencyResolveTask';
import {InstallTask} from '../tasks/InstallTask';
import {NpmScriptTask} from '../tasks/NpmScriptTask';

export function applyJSProjectPlugin(project: Project) {
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

  const packageJson = project.getPackageJson();
  const dependencies = merge({}, packageJson.dependencies, packageJson.devDependencies);

  DependencyResolveTask.create(project, 'dependencyResolve')
    .dependencies(dependencies);

  InstallTask.create(project, 'install');

  CleanTask.create(project, 'clean')
    .clean('build');

  forEach(packageJson.scripts, (command: string, scriptName: string) => {
    NpmScriptTask.create(project, scriptName)
      .command(command);
  });
}
