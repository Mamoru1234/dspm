const {CopyTask} = require('./.dspm/dist/main/tasks/CopyTask');

module.exports = (project) => {
  const packageTask = project.getSubProject('tsProject').getTask('package');

  CopyTask.create(project, 'processModules')
    .from(packageTask.getTargetPath())
    .into('build/libs/ts-project.tgz')
    .dependsOn(packageTask);

  project.getTask('install')
    .dependsOn('processModules')
};
