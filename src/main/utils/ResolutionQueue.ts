import {findIndex} from 'lodash';
import {DepTreeNode} from './DepTreeNode';

export interface ResolutionQueueItem {
  parent: DepTreeNode;
  packageName: string;
  packageDescription: any;
  resolverName?: string;
}

export class ResolutionQueue {
  private _queue: ResolutionQueueItem[][] = [];

  public addItem(item: ResolutionQueueItem): void {
    const queueLevel = this._findQueueLevel(item);
    if (queueLevel === -1) {
      this._queue.push([item]);
      return;
    }
    this._queue[queueLevel].push(item);
  }

  public pullQueue(): ResolutionQueueItem[] | undefined {
    return this._queue.shift();
  }

  private _findQueueLevel(item: ResolutionQueueItem): number {
    return findIndex(this._queue, (queueLevel: ResolutionQueueItem[]) => {
      return !queueLevel.some((queueItem: ResolutionQueueItem) => {
        return queueItem.packageName === item.packageName;
      });
    });
  }
}
