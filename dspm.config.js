const { join } = require('path');
const { ArchiveTask } = require('./build/dist/main/tasks/ArchiveTask');
const { InstallTask } = require('./build/dist/main/tasks/InstallTask');
const { NpmScriptTask } = require('./build/dist/main/tasks/NpmScriptTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { FSLockProvider } = require('./build/dist/main/caches/FSLockProvider');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('prod', new FSLockProvider(join(project.getProjectPath(), 'dspm.prod.lock.json')));

  InstallTask.create(project, 'installDist')
    .lockProvider('prod')
    .dependencies(require('./package').dependencies)
    .targetPath('./build/dist');

  NpmScriptTask.create(project, 'processBin')
    .command('node scripts/processDspm.js && chmod +x build/dspm')
    .env('DSPM_VERSION', process.env.TRAVIS_TAG || '1.0.0');

  ArchiveTask.create(project, 'distArchive')
    .from('./build/dist')
    .from('.', { entries: ['package.json'] })
    .into('build/dspm.tar.gz')
    .useGzip()
    .dependsOn('installDist')
    .dependsOn('processBin');
};
