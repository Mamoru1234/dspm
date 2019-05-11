const {ArchiveTask} = require('./.dspm/dist/main/tasks/ArchiveTask');
const {NpmScriptTask} = require('./.dspm/dist/main/tasks/NpmScriptTask');

module.exports = (project) => {
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
