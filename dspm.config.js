const { createInstallTask } = require('./build/dist/main/InstallTask');
const { createCmdTask } = require('./build/dist/main/CmdTask');
const { applyJSProjectPlugin } = require('./build/dist/main/plugins/JSProjectPlugin');

module.exports = (project) => {
  applyJSProjectPlugin(project);

  console.log(project.getProperty('fromLock'), typeof project.getProperty('fromLock'));
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
    task.command(`rm -rf build/dist/node_modules`);
  });

  createInstallTask(project, 'installDist', (task) => {
    task.dependsOn('clean');
    task.dependencies('default', require('./package').dependencies);
    task.targetPath('./build/dist');
  });
};
