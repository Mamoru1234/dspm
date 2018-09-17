const { applyJSProjectPlugin } = require('./.dspm/dist/main/plugins/JSProjectPlugin');
const {ArchiveTask} = require('./.dspm/dist/main/tasks/ArchiveTask');
const {CleanTask} = require('./.dspm/dist/main/tasks/CleanTask');
const {NpmScriptTask} = require('./.dspm/dist/main/tasks/NpmScriptTask');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  CleanTask.create(project, 'clean')
    .clean('build');

  NpmScriptTask.create(project, 'build')
    .dependsOn('clean')
    .command('tsc');

  ArchiveTask.create(project, 'package')
    .from('build/dist')
    .from('.', { entries: ['package.json'] })
    .useGzip()
    .dependsOn('build')
    .into('build/ts-project.tgz');
};
