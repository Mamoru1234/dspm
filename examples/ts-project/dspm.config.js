const { applyJSProjectPlugin } = require('./.dspm/dist/main/plugins/JSProjectPlugin');

module.exports = {
  configurator: (project) => {
    applyJSProjectPlugin(project);
    const subProject = project.getSubProject('sub-project');
    project.getTask('install')
      .dependsOn(subProject.getTask('install'));
  },
  subProjects: {
    'sub-project': './sub-project',
  }
};
