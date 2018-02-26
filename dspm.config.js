const { createCmdTask } = require('./build/dist/main/CmdTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { refineDepTask } = require('./build/dist/main/DependencyTask');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  createCmdTask(project, 'abc', (task) => {
    task.command('sleep 1s');
  });

  refineDepTask(project, 'install', (task) => {
    task.dependency('npm', 'webpack');
  });

  createCmdTask(project, 'test', (task) => task
    .command('echo $test')
    .dependsOn('abc')
    .dependsOn('install')
  );
};
