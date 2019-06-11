import chai from 'chai';
import promised from 'chai-as-promised';
import fs from 'fs-extra';
import {describe, it} from 'mocha';
import { tmpdir } from 'os';
import { join } from 'path';
import {DepTreeNode} from '../../utils/DepTreeNode';
import {PresPackageMetaOptions} from './PresidiumeInterface';
import {PresidiumeResolver} from './PresidiumeResolver';

if (process.env.TRAVIS === 'true') {
  // @ts-ignore
  return;
}

chai.use(promised);

const expect = chai.expect;

const MINUTES = 1000 * 60;

describe('PresiumeResolver', function() {
  this.timeout(60 * MINUTES);
  const packageDescription = {
    resolverArgs: {
      packageName: 'bcrypt',
      packageVersion: '^3.0.6',
    },
    resolverName: 'npm',
    semVersion: '^3.0.6',
  };
  const depTreeNode: DepTreeNode<PresPackageMetaOptions> = {
    children: [],
    dependencies: {},
    options: {
      integrity: 'sha512-NRO7Toc7fOho5sfadybdCms3LNySTvMS9Ye2kYKu/8QMDzTOEzmLj2BGT4Dh8oN0GYD263Xo2MU5gt9Dsysfdw==',
      parameters: {
        arch: 'x64',
        libc: 'glibc',
        node_abi: 'node-v67',
        platform: 'linux',
      },
    },
    packageName: 'bcrypt',
    packageVersion: '3.0.6',
  };
  let tempDir: string = '';
  before(() => {
    const dir = join(tmpdir(), 'pres' + Math.random().toFixed(5));
    fs.mkdirsSync(dir);
    tempDir = dir;
  });
  after(() => {
    fs.removeSync(tempDir);
  });
  describe('working case', () => {
    it('getMetaData', async () => {
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1000,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 10 * MINUTES,
        resolverName: 'npm',
      });
      const meta = await resolver.getMetaData(packageDescription);
      expect(meta).to.be.eqls({
        dependencies: {
          'nan': '2.13.2',
          'node-pre-gyp': '0.12.0',
        },
        name: 'bcrypt',
        options: {
          integrity: 'sha512-NRO7Toc7fOho5sfadybdCms3LNySTvMS9Ye2kYKu/8QMDzTOEzmLj2BGT4Dh8oN0GYD263Xo2MU5gt9Dsysfdw==',
          parameters: {
            arch: 'x64',
            libc: 'glibc',
            node_abi: 'node-v67',
            platform: 'linux',
          },
        },
        version: '3.0.6',
      });
    });
    it('extract', async () => {
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1000,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 10 * MINUTES,
        resolverName: 'npm',
      });
      const targetFolder = join(__dirname, 'working');
      fs.mkdirsSync(targetFolder);
      await resolver.extract(targetFolder, depTreeNode);
    });
  });
  describe('request time limit', () => {
    it('getMetaData', async () => {
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1000,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 300,
        resolverName: 'npm',
      });
      await expect(resolver.getMetaData(packageDescription)).eventually.rejectedWith();
    });
    it('extract', async () => {
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1000,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 10,
        resolverName: 'npm',
      });
      const targetFolder = join(tempDir, 'time');
      fs.mkdirsSync(targetFolder);
      await expect(resolver.extract(targetFolder, depTreeNode)).eventually.rejectedWith();
    });
  });
  describe('response integrity', () => {
    it('extract', async () => {
      const wrongNode: DepTreeNode<PresPackageMetaOptions> = {
        ...depTreeNode,
        options: {
          integrity: 'sha512-14hgP2wtf6SPu+26Ofye6Se9u6Mmjc07a0ACHTJ5POKFU1Mtxz2IxSvaWy1O+QnbSa8XHy1gYz2E1l+G27XJdA==',
          parameters: depTreeNode.options!!.parameters,
        },
      };
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1000,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 10000,
        resolverName: 'npm',
      });
      const targetFolder = join(tempDir, 'integrity');
      fs.mkdirsSync(targetFolder);
      await expect(resolver.extract(targetFolder, wrongNode)).eventually.rejectedWith();
    });
  });
  describe('package size limit', () => {
    it('extract', async () => {
      const resolver = new PresidiumeResolver({
        packageSizeLimit: 1,
        publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
        repositoryUrl: 'http://localhost:3000',
        requestTimeout: 10000,
        resolverName: 'npm',
      });
      const targetFolder = join(tempDir, 'integrity');
      fs.mkdirsSync(targetFolder);
      await expect(resolver.extract(targetFolder, depTreeNode)).eventually.rejectedWith();
    });
  });
});
