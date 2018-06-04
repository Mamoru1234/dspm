import forEach from 'lodash/forEach';
import merge from 'lodash/merge';
import {homedir} from 'os';
import {join} from 'path';

import {FSLockProvider} from '../caches/FSLockProvider';
import {Project} from '../Project';
import {NpmDependencyResolver} from '../resolvers/NpmDependencyResolver';
import {CleanTask} from '../tasks/CleanTask';
import {InstallTask} from '../tasks/InstallTask';
import {NpmScriptTask} from '../tasks/NpmScriptTask';

export function applyJSProjectPlugin(project: Project) {
  const cachePath = project.getProperty('cache:path', join(homedir(), '.cache', 'dspm'));
  const resolver = new NpmDependencyResolver('npm', cachePath);
  const resolvers = project.ensureNameSpace('resolvers');
  resolvers.setItem('npm', resolver);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('default', new FSLockProvider(join(project.getProjectPath(), 'dspm.lock.json')));

  const packageJson = require(join(project.getProjectPath(), 'package.json'));
  const dependencies = merge({}, packageJson.dependencies, packageJson.devDependencies);

  CleanTask.create(project, 'cleanModules')
    .clean('node_modules');

  InstallTask.create(project, 'install')
    .dependencies(dependencies)
    .dependsOn('cleanModules');

  forEach(packageJson.scripts, (command: string, scriptName: string) => {
    NpmScriptTask.create(project, scriptName)
      .command(command);
  });
}
