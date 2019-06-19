import { Project } from '../Project';
import { CmdTask } from '../tasks/CmdTask';
import { CopyTask } from '../tasks/CopyTask';
import {GitVersionResolver} from '../tasks/VersionTask/GitVersionResolver';
import {VersionResolver} from '../tasks/VersionTask/VersionResolver';
import {VersionTask} from '../tasks/VersionTask/VersionTask';

export function applyNpmPlugin(project: Project) {
  CopyTask.create(project, 'package')
    .from('build/dist')
    .fromFile('README.md')
    .fromFile('package.json')
    .into('build/module');

  const resolvers = project.ensureNameSpace<VersionResolver>(VersionTask.NAMESPACE);
  resolvers.setItem('git', new GitVersionResolver());

  VersionTask.create(project, 'findVersion');

  CmdTask.create(project, 'publish')
    .command('npm publish ./build/module')
    .dependsOn('package');
}
