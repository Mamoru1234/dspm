/* tslint:disable */
import Promise from 'bluebird';
import 'mocha';
import forEach from 'lodash/forEach';
import sortBy from 'lodash/sortBy';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon, {SinonFakeTimers} from 'sinon';
import {ResolutionParam, TestDepResolver} from './TestDepResolver';
import {Namespace} from '../Namespace';
import {DepTreeBuilder, DepTreeNode} from './DepTreeBuilder';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const {expect} = chai;

interface AssertTreeNode {
  packageName?: string;
  packageVersion?: string;
  children: AssertTreeNode[];
}

interface GenerationConfig {
  message: string;
  resolvers: {[key: string]: ResolutionParam[]};
  resolutionCalls: {
    dependencies: {[key: string]: string};
    resolverName: string;
  }[];
  root: AssertTreeNode;
}

function assertTreeNode(depNode: DepTreeNode, testNode: AssertTreeNode) {
  expect(depNode.packageName).equals(testNode.packageName);
  expect(depNode.packageVersion).equals(testNode.packageVersion);
  const children = sortBy(depNode.children, (child) => {
    return child.packageName;
  });
  expect(children).to.have.property('length').equals(testNode.children.length);
  forEach(children, (node, ind) => {
    assertTreeNode(node, testNode.children[ind]);
  })
}

function generateResolutionTest(getClock: () => SinonFakeTimers, config: GenerationConfig) {
  it(config.message, (done) => {
    const resolvers = new Namespace<TestDepResolver>();
    forEach(config.resolvers, (resolveConfig: ResolutionParam[], resolverName: string) => {
      resolvers.setItem(resolverName, new TestDepResolver(resolveConfig));
    });
    const builder = new DepTreeBuilder(resolvers);
    const resolution = config.resolutionCalls.map(({ dependencies, resolverName }) => {
      return builder.resolveDependencies(dependencies, resolverName);
    });
    Promise.all(resolution)
      .then(() => {
        const root = builder.getRoot();
        assertTreeNode(root, config.root);
        expect(root.children).to.be.not.empty;
        //TODO add root assert
        done();
      })
      .catch(done);
    getClock().runAll();
  });
}

describe('utils/DepTreeBuilder', () => {
  let clock: SinonFakeTimers;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });
  generateResolutionTest(() => clock, {
    message: 'Simple resolution',
    resolvers: {
      'default': [
        {
          description: '^1.0.0',
          time: 100,
          metaData: {
            version: '1.0.1',
            name: 'a',
            dependencies: {
              b: '^1.0.0'
            },
            options: {},
          },
        },
        {
          description: '^1.0.0',
          time: 10,
          metaData: {
            version: '1.1.1',
            name: 'b',
            dependencies: {},
            options: {},
          },
        },
      ]
    },
    resolutionCalls: [
      {
        dependencies: {
          a: '^1.0.0',
        },
        resolverName: 'default'
      },
    ],
    root: {
      children: [
        {
          packageName: 'a',
          packageVersion: '1.0.1',
          children: [],
        },
        {
          packageVersion: '1.1.1',
          packageName: 'b',
          children: [],
        }
      ],
    },
  });
});
