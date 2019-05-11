import Promise from 'bluebird';
import rimraf from 'rimraf';

import {PathLike, readFile, symlink, writeFile} from 'fs';
import {copy, ensureDir} from 'fs-extra';

export type NullableError = Error | null;

export const copyAsync = Promise.promisify((// this function is needed for correct type inference
  src: string, dest: string, callback: (err: NullableError, result?: void) => void) => copy(src, dest, callback));

export const rimrafAsync = Promise.promisify(
  (path: string, callback: (error: NullableError, result?: void) => void) => rimraf(path, callback));

export const readFileAsync = Promise.promisify((
  src: PathLike, callback: (error: NullableError, result: string | Buffer) => void) => readFile(src, callback));

export const writeFileAsync = Promise.promisify((
  src: PathLike, data: any, callback: (error: NullableError, result?: void) => void) => writeFile(src, data, callback));

export const symLinkAsync = Promise.promisify((
  target: PathLike, path: PathLike, callback: (error: NullableError, result?: void) => void,
) => symlink(target, path, callback));

export const ensureDirAsync = (path: string) => Promise.resolve(ensureDir(path));
