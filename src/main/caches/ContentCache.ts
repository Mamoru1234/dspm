import Promise from 'bluebird';
import WritableStream = NodeJS.WritableStream;
import ReadableStream = NodeJS.ReadableStream;

export interface ContentCache {
  hasItem(itemKey: string): Promise<boolean>;

  getItem(itemKey: string): Promise<ReadableStream>;

  setItem(itemKey: string): Promise<WritableStream>;
}
