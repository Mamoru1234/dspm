const { applyJSProjectPlugin } = require('./.dspm/dist/main/plugins/JSProjectPlugin');
const {CleanTask} = require('./.dspm/dist/main/tasks/CleanTask');
const {CopyTask} = require('./.dspm/dist/main/tasks/CopyTask');

module.exports = {
  configurator: (project) => {
    applyJSProjectPlugin(project);
    const tsProject = project.getSubProject('ts-project');

    CleanTask.create(project, 'clean')
      .clean('build');

    CopyTask.create(project, 'processResources')
      .from('../ts-project/build/ts-project.tgz')
      .into('build/libs/ts-project.tgz')
      .dependsOn('clean')
      .dependsOn(tsProject.getTask('package'));

    project.getTask('install')
      .dependsOn('processResources');
  },
  subProjects: {
    'ts-project': '../ts-project',
  },
};


