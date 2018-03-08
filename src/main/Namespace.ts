export class Namespace<T> {
  constructor(private _cache: {[key: string]: T} = {}) {}

  public hasItem(key: string): boolean {
    return has(this._cache, key);
  }

  public setItem(key: string, value: T) {
    this._cache[key] = value;
  }

  public getItem(key: string): T {
    return this._cache[key];
  }
}
