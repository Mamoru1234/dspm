interface SemaphoreQueueItem {
  task: () => Promise<any>,
  resolve: Function
  reject: Function
}

export class AutoReleaseSemaphore {
  constructor(private __value = 0) {
    this.__pullQueue = this.__pullQueue.bind(this);
  }
  private __queue: Array<SemaphoreQueueItem> = [];

  private __pullQueue() {
    const t = this.__queue.shift();
    if (!t) {
      this.__value++;
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

  public acquire<T>(task: () => Promise<T>): Promise<T> {
    if (this.__value === 0) {
      return new Promise((resolve, reject) => {
        this.__queue.push({
          task,
          resolve,
          reject
        });
      });
    }
    this.__value--;
    return task().then((value) => {
      this.__pullQueue();
      return value;
    });
  }
}
