const { join } = require('path');
const { createInstallTask } = require('./build/dist/main/tasks/InstallTask');
const { createCleanTask } = require('./build/dist/main/tasks/CleanTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { FSLockProvider } = require('./build/dist/main/caches/FSLockProvider');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  const lockProviders = project.ensureNameSpace('lock_providers');
  lockProviders.setItem('prod', new FSLockProvider(join(project.getProjectPath(), 'dspm.prod.lock.json')));


  createCleanTask(project, 'clean', (task) => task
    .clean('build/dist/node_modules')
  );

  createInstallTask(project, 'installDist', (task) => task
    .dependsOn('clean')
    .lockProvider('prod')
    .dependencies('default', require('./package').dependencies)
    .targetPath('./build/dist'),
  );
};
