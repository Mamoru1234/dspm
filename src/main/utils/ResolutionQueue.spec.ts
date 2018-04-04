import { expect } from 'chai';
import 'mocha';
import {ResolutionQueue} from './ResolutionQueue';

describe('utils/ResolutionQueue', () => {
  let parent: any = null;
  beforeEach(() => {
    parent = {};
  });
  it('should add item to queue', () => {
    const queue = new ResolutionQueue();
    const item = {
      packageDescription: 'retes',
      packageName: 'a',
      parent,
    };
    queue.addItem(item);
    const queueLevel = queue.pullQueue();
    expect(queueLevel).to.have.lengthOf(1);
    expect(queueLevel![0]).to.be.eqls(item);
    expect(queue.pullQueue()).to.be.eqls(undefined);
  });
  it('should add couple items without conflicts into same level', () => {
    const queue = new ResolutionQueue();
    const items = [
      {
        packageDescription: 'retes',
        packageName: 'a',
        parent,
      },
      {
        packageDescription: 'retes',
        packageName: 'b',
        parent,
      },
    ];
    items.forEach((item) => {
      queue.addItem(item);
    });
    expect(queue.pullQueue()).to.be.eqls(items);
    expect(queue.pullQueue()).to.be.eqls(undefined);
  });
  it('should add items with conflict to different level', () => {
    const queue = new ResolutionQueue();
    const items = [
      {
        packageDescription: 'retes',
        packageName: 'a',
        parent,
      },
      {
        packageDescription: 'retes',
        packageName: 'b',
        parent,
      },
      {
        packageDescription: 'retes',
        packageName: 'a',
        parent,
      },
      {
        packageDescription: 'retes',
        packageName: 'b',
        parent,
      },
    ];
    items.forEach((item) => {
      queue.addItem(item);
    });
    expect(queue.pullQueue()).to.be.eqls(items.slice(0, 2));
    expect(queue.pullQueue()).to.be.eqls(items.slice(2, 4));
    expect(queue.pullQueue()).to.be.eqls(undefined);
  });
});
