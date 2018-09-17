/* tslint:disable */
import Promise from 'bluebird';
import {DependencyResolver, PackageMetaData} from '../resolvers/DependencyResolver';
import sinon from 'sinon';
import forEach from 'lodash/forEach';
import {DepTreeNode} from './DepTreeNode';
import {log} from 'util';
import {createTimer} from './TimerPromise';
import {PackageDescription} from './package/PackageDescription';

export interface ResolutionParam {
  time: number;
  description: string;
  name: string;
  dependencies: {[key: string]: string};
  resolvedVersion: string;
}

export class TestDepResolver implements DependencyResolver{
  public getMetadataStub: sinon.SinonStub;

  extract(targetFolder: string, node: DepTreeNode): Promise<void> {
    log(targetFolder);
    log(node.packageName!!);
    throw new Error('this kind of resolver not designed for extract');
  }

  getMetaData(packageDescription: PackageDescription): Promise<PackageMetaData> {
    const resolverArgs = packageDescription.resolverArgs;
    log(resolverArgs.packageName);
    log(resolverArgs.packageVersion);
    throw new Error('Unreached code');
  }

  parseDependencyItem(dependencyKey: string, dependencyDescription: string): PackageDescription {
    return {
      resolverArgs: {
        packageName: dependencyKey,
        packageVersion: dependencyDescription,
      },
      resolverName: 'npm',
      semVersion: dependencyDescription,
    };
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
        .withArgs(resolutionItem.description)
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
