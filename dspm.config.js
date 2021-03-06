const { join } = require('path');
const { ArchiveTask } = require('./build/dist/main/tasks/ArchiveTask');
const { DependencyResolveTask } = require('./build/dist/main/tasks/DependencyResolveTask');
const { InstallTask } = require('./build/dist/main/tasks/InstallTask');
const { NpmScriptTask } = require('./build/dist/main/tasks/NpmScriptTask');
const { FSLockProvider } = require('./build/dist/main/caches/FSLockProvider');

module.exports = (project) => {
  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('prod', new FSLockProvider(join(project.getProjectPath(), 'dspm.prod.lock.json')));
  DependencyResolveTask.create(project, 'dependencyProd')
    .lockProvider('prod')
    .dependencies(require('./package').dependencies);

  InstallTask.create(project, 'installDist')
    .resolveTask('dependencyProd')
    .targetPath('./build/dist');

  NpmScriptTask.create(project, 'processBin')
    .installTask('installDist')
    .command('node scripts/processDspm.js && chmod +x build/dspm')
    .env('DSPM_VERSION', process.env.TRAVIS_TAG || 'local');

  ArchiveTask.create(project, 'distArchive')
    .from('./build/dist')
    .from('.', { entries: ['package.json'] })
    .into('build/dspm.tar.gz')
    .useGzip()
    .dependsOn('installDist')
    .dependsOn('processBin');
};
