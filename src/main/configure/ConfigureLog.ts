import log4js from 'log4js';
import {tmpdir} from 'os';
import {join} from 'path';

export const LOG_FILE_PATH = join(tmpdir(), `dspm_${Date.now()}.log`);

export function configure() {
  log4js.configure({
    appenders: {
      file: {
        filename: LOG_FILE_PATH,
        type: 'fileSync',
      },
      out: {
        type: 'stdout',
      },
    },
    categories: {
      default: {
        appenders: ['out', 'file'],
        level: 'info',
      },
    },
  });
}
