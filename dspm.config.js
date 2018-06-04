const { join } = require('path');
const { ArchiveTask } = require('./build/dist/main/tasks/ArchiveTask');
const { InstallTask } = require('./build/dist/main/tasks/InstallTask');
const { CleanTask } = require('./build/dist/main/tasks/CleanTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { FSLockProvider } = require('./build/dist/main/caches/FSLockProvider');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('prod', new FSLockProvider(join(project.getProjectPath(), 'dspm.prod.lock.json')));

  CleanTask.create(project, 'clean')
    .clean('build/dist/node_modules');

  InstallTask.create(project, 'installDist')
    .dependsOn('clean')
    .lockProvider('prod')
    .dependencies(require('./package').dependencies)
    .targetPath('./build/dist');

  ArchiveTask.create(project, 'distArchive')
    .from('./build/dist')
    .from('.', { entries: ['package.json'] })
    .into('build/dspm.tar.gz')
    .useGzip()
    .dependsOn('installDist');
};
