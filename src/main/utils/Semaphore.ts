import Promise from 'bluebird';

interface SemaphoreQueueItem {
  task: () => Promise<any>;
  resolve: any;
  reject: any;
}

export class AutoReleaseSemaphore {
  private _queue: SemaphoreQueueItem[] = [];

  constructor(private _value = 0) {
    this.__pullQueue = this.__pullQueue.bind(this);
  }

  public acquire<T>(task: () => Promise<T>): Promise<T> {
    if (this._value === 0) {
      return new Promise((resolve, reject) => {
        this._queue.push({
          reject,
          resolve,
          task,
        });
      });
    }
    this._value--;
    return task().then((value) => {
      this.__pullQueue();
      return value;
    });
  }

  private __pullQueue() {
    const t = this._queue.shift();
    if (!t) {
      this._value++;
      return;
    }
    t.task().then((value) => {
      t.resolve(value);
      this.__pullQueue();
    }).catch((err) => {
      t.reject(err);
      this.__pullQueue();
    });
  }
}
