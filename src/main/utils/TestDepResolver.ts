/* tslint:disable */
import Promise from 'bluebird';
import {DependencyResolver, PackageMetaData} from '../resolvers/DependencyResolver';
import sinon from 'sinon';
import forEach from 'lodash/forEach';
import {DepTreeNode} from './DepTreeBuilder';
import {log} from 'util';
import {createTimer} from './TimerPromise';

export interface ResolutionParam {
  time: number;
  description: string;
  name: string;
  dependencies: {[key: string]: string};
  resolvedVersion: string;
}

export class TestDepResolver implements DependencyResolver{
  public getMetadataStub: sinon.SinonStub;

  extract(targetFolder: string, node: DepTreeNode): Promise<string> {
    log(targetFolder);
    log(node.packageName!!);
    throw new Error('this kind of resolver not designed for extract');
  }

  getMetaData(packageName: string, packageDescription: any): Promise<PackageMetaData> {
    log(packageName);
    log(packageDescription);
    throw new Error('Unreached code');
  }

  constructor(resolutionConfig: ResolutionParam[]) {
    this.getMetadataStub = sinon.stub().throws('Unknown package getting');
    forEach(resolutionConfig, (resolutionItem: ResolutionParam) => {
      const metaData: PackageMetaData = {
        name: resolutionItem.name,
        dependencies: resolutionItem.dependencies,
        version: resolutionItem.resolvedVersion,
        options: {},
      };
      this.getMetadataStub
        .withArgs(resolutionItem.name, resolutionItem.description)
        .callsFake(() => {
          return createTimer(resolutionItem.time, metaData)
        });
    });
    this.getMetaData = (...args: any[]) => {
      return this.getMetadataStub(...args).then((result: any) => {
        return result;
      });
    }
  }
}
