import { Project } from '../Project';
import { CmdTask } from '../tasks/CmdTask';
import { CopyTask } from '../tasks/CopyTask';

export function applyNpmPlugin(project: Project) {
  CopyTask.create(project, 'package')
    .from('build/dist')
    .fromFile('README.md')
    .fromFile('package.json')
    .into('build/module');

  CmdTask.create(project, 'publish')
    .command('npm publish ./build/module')
    .dependsOn('package');
}
