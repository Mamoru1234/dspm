const {CopyTask} = require('./.dspm/dist/main/tasks/CopyTask');
const {join} = require('path');

module.exports = (project) => {
  CopyTask.create(project, 'processModules')
    .from(join(project.getSubProject('tsProject').getProjectPath(), 'build/ts-project.tgz'))
    .into('build/libs/ts-project.tgz')
    .dependsOn(project.getSubProject('tsProject').getTask('package'));

  project.getTask('install')
    .dependsOn('processModules')
};
