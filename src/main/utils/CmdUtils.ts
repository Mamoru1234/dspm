import Promise from 'bluebird';
import {spawn, SpawnOptions} from 'child_process';
import assign from 'lodash/assign';
import log4js from 'log4js';

const logger = log4js.getLogger('utils/CmdUtils');

const SHELL = process.platform === 'win32'
  ? 'cmd'
  : 'sh';

const SHELL_FLAG = process.platform === 'win32'
  ? '/c'
  : '-c';

const DEFAULT_OPTIONS = {
  stdio: 'inherit',
  windowsVerbatimArguments: process.platform === 'win32',
};

export function executeCommand(command: string, spawnOptions?: SpawnOptions): Promise<number> {
  return new Promise((resolve, reject) => {

    const options = assign({}, DEFAULT_OPTIONS, spawnOptions);

    logger.info(`Executing command: ${command}`);

    spawn(SHELL, [SHELL_FLAG, command], options)
      .on('close', (code: number) => {
        if (code === 0) {
          resolve(code);
          return;
        }
        reject(code);
      });
  });
}
