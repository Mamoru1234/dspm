/* tslint:disable */
import Promise from 'bluebird';

Promise.setScheduler((callback: (...args: any[]) => void): void => {
  setTimeout(callback, 0);
});

export function createTimer<T>(timePeriod: number, resolveValue: T): Promise<T> {
  return new Promise((res:(value: T) => void) => {
    setTimeout(() => {
      res(resolveValue);
    }, timePeriod);
  });
}
