const { createCmdTask } = require('./build/dist/main/CmdTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');
const { refineDepTask } = require('./build/dist/main/DependencyTask');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  const modePrefix = 'test_mod';

  createCmdTask(project, 'a', (task) => task
    .command(`sleep 1s`)
  );

  createCmdTask(project, 'b', (task) => task
    .dependsOn('a')
    .command(`sleep 1s`)
  );

  createCmdTask(project, 'c', (task) => task
    .command(`sleep 1s`)
    .dependsOn('a')
  );

  createCmdTask(project, 'd', (task) => {
    task.dependsOn('c');
    task.command(`sleep 1s`);
  });

  createCmdTask(project, 'e', (task) => task
    .dependsOn('d')
    .dependsOn('b')
    .command('echo DONE')
  );

  createCmdTask(project, 'clean', (task) => {
    task.command(`rm -rf ${modePrefix}`);
  });

  refineDepTask(project, 'install', (task) => {
    task.dependsOn('clean');
    task.dependencies('default', require('./package').dependencies);
    task.modulePrefix(modePrefix);
  });
  // createCmdTask(project, 'test', (task) => task
  //   .command('echo $test')
  //   .dependsOn('abc')
  //   .dependsOn('install')
  // );
};
