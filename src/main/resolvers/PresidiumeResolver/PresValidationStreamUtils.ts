import crypto from 'crypto';
import {Transform} from 'stream';
import through, {FlushCallback, TransformFunction} from 'through2';
import {log} from 'util';

export function createIntegrityStream(sri: string, details: string) {
  const [algorithm, hashValue] = sri.split('-');
  const hash = crypto.createHash(algorithm);
  const transform: TransformFunction = function(chunk: any, encoding: string, next: any) {
    hash.update(chunk);
    this.push(chunk, encoding);
    next();
  };
  const flush: FlushCallback = function(this: Transform, next: any) {
    const digest = hash.digest('base64');
    if (digest !== hashValue) {
      log(`Integrity mismatch: ${details}`);
      next();
      return;
    }
    next();
  };
  return through(transform, flush);
}

export function createSizeValidationStream(maxSize: number, details: string) {
  let totalSize = 0;
  const transform: TransformFunction = function(chunk: any, encoding: string, next: any) {
    totalSize += chunk.length;
    if (totalSize > maxSize) {
      next(`Max package size overflowed: ${details}`);
    }
    this.push(chunk, encoding);
    next();
  };
  return through(transform);
}
