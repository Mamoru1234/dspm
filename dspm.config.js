const { createCmdTask } = require('./build/dist/models/CmdTask');
module.exports = (project) => {
  createCmdTask(project, 'abc', (task) => {
    task.command('sleep 10s');
  });

  createCmdTask(project, 'test', (task) => task
    .command('echo $test')
    .dependsOn('abc')
  );
};
