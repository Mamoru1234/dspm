import {expect} from 'chai';
import {FileDependencyResolver} from './FileDependencyResolver';

if (process.env.TRAVIS === 'true') {
  // @ts-ignore
  return;
}

describe('resolvers/FileResolver', () => {
  describe('getMetaData', () => {
    describe('correct archive(withPackage.tgz)', () => {
      const packageDescription = {
        resolverArgs: {
          filePath: 'resources/withPackage.tgz',
          moduleName: 'test-module',
        },
        resolverName: 'file',
      };
      it('only dependencies', async () => {
        const resolver = new FileDependencyResolver({
          basePath: __dirname,
          depProperties: ['dependencies'],
          name: 'file',
        });
        const result = await resolver.getMetaData(packageDescription);
        expect(result.dependencies).to.eqls({
          bcrypt: '^3.0.0',
        });
      });
      it('should merge depProperties', async () => {
        const resolver = new FileDependencyResolver({
          basePath: __dirname,
          depProperties: ['dependencies', 'devDependencies'],
          name: 'file',
        });
        const result = await resolver.getMetaData(packageDescription);
        expect(result.dependencies).to.eqls({
          bcrypt: '^3.0.0',
          typescript: '^2.7.2',
        });
      });
    });
    describe('wrong archive(withoutPackage.tgz)', () => {
      const packageDescription = {
        resolverArgs: {
          filePath: 'resources/withoutPackage.tgz',
          moduleName: 'test-module',
        },
        resolverName: 'file',
      };
      it('should fail when archive don\'t have package.json', (done) => {
        const resolver = new FileDependencyResolver({
          basePath: __dirname,
          depProperties: ['dependencies'],
          name: 'file',
        });
        resolver.getMetaData(packageDescription)
          .then(() => done(new Error('should fail')))
          .catch((error: Error) => {
            expect(error.message).to.be.eqls('No packageInfo found');
            done();
          });
      });
    });
  });
});
