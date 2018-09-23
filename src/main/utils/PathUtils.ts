import {isAbsolute, join} from 'path';

export function normalizePath(basePath: string, targetPath: string): string {
  if (isAbsolute(targetPath)) {
    return targetPath;
  }
  return join(basePath, targetPath);
}
