const {CleanTask} = require('./.dspm/dist/main/tasks/CleanTask');
const {NpmScriptTask} = require('./.dspm/dist/main/tasks/NpmScriptTask');
const {CopyTask} = require('./.dspm/dist/main/tasks/CopyTask');
const {CmdTask} = require('./.dspm/dist/main/tasks/CmdTask');

module.exports = (project) => {
  CleanTask.create(project, 'clean')
    .clean('build');

  project.getTask('install')
    .dependsOn('clean');

  NpmScriptTask.create(project, 'lint')
    .command('tslint -p .');

  NpmScriptTask.create(project, 'build')
    .command('tsc -p tsconfig.prod.json')
    .dependsOn('lint');

  CopyTask.create(project, 'copyPackage')
    .from('package.json')
    .into('build/module/package.json')
    .dependsOn('build');

  CopyTask.create(project, 'package')
    .from('build/dist')
    .into('build/module')
    .dependsOn('copyPackage');

  CmdTask.create(project, 'publish')
    .command('npm publish ./build/module')
    .dependsOn('package');
};


