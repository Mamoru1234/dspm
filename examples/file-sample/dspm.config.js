const {CopyTask} = require('./.dspm/dist/main/tasks/CopyTask');

module.exports = (project) => {
  CopyTask.create(project, 'processModules')
    .from('../ts-project/build/ts-project.tgz')
    .into('build/libs/ts-project.tgz')
    .dependsOn(project.getSubProject('tsProject').getTask('package'));

  project.getTask('install')
    .dependsOn('processModules')
};
