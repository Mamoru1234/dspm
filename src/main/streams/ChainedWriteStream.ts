import {Transform} from 'stream';
import WritableStream = NodeJS.WritableStream;

export class ChainedWriteStream extends Transform {

  constructor(private _source: WritableStream) {
    super();
  }

  public _transform(chunk: any, encoding: string, callback: any): void {
    this.push(chunk, encoding);
    this._source.write(chunk, encoding, callback);
  }

  public _flush(cb: any) {
    this._source.end(cb);
  }
}
