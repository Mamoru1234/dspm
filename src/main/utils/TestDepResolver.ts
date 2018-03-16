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
  metaData: PackageMetaData;
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
      this.getMetadataStub
        .withArgs(resolutionItem.metaData.name, resolutionItem.description)
        .returns(createTimer(resolutionItem.time, resolutionItem.metaData));
    });
    this.getMetaData = this.getMetadataStub;
  }
}
