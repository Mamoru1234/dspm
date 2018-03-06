const { createCmdTask } = require('./build/dist/main/CmdTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { refineDepTask } = require('./build/dist/main/DependencyTask');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  createCmdTask(project, 'clean', (task) => {
    task.command('rm -rf test_mod');
  });

  refineDepTask(project, 'install', (task) => {
    task.dependsOn('clean');
    task.dependencies('npm', require('./package').dependencies);
    task.targetFolder('./test_mod');
  });
  // createCmdTask(project, 'test', (task) => task
  //   .command('echo $test')
  //   .dependsOn('abc')
  //   .dependsOn('install')
  // );
};
