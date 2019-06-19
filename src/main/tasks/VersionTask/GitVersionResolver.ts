import Bluebird from 'bluebird';
import {exec, ExecException, ExecOptions} from 'child_process';
import {Project} from '../../Project';
import {VersionResolver} from './VersionResolver';

interface ExecResult {
  stdout: string;
  stderr: string;
}

const execAsync = (command: string, options: ExecOptions) => new Bluebird<ExecResult>((res, rej) => {
  exec(command, options, (err: ExecException | null, stdout: string, stderr: string) => {
    if (err) {
      rej(err);
      return;
    }
    res({
      stderr,
      stdout,
    });
  });
});

export class GitVersionResolver implements VersionResolver {
  public async getVersion(project: Project): Bluebird<string> {
    const { stdout: tagText } = await execAsync('git describe $(git rev-list --tags --max-count=1)', {
      cwd: project.getProjectPath(),
    });
    return Bluebird.resolve(tagText.trim());
  }
}
