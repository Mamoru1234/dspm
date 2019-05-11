/* tslint:disable */
import 'mocha';
import forEach from 'lodash/forEach';
import sortBy from 'lodash/sortBy';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon, {SinonFakeTimers} from 'sinon';
import {ResolutionParam, TestDepResolver} from './TestDepResolver';
import {Namespace} from '../Namespace';
import {DepTreeBuilder} from './DepTreeBuilder';
import {DepTreeNode} from './DepTreeNode';
import {convertDependenciesMap} from './package/PackageJsonParse';
import Done = Mocha.Done;

chai.use(chaiAsPromised);
chai.use(sinonChai);

const {expect} = chai;

interface AssertTreeNode {
  packageName?: string;
  packageVersion?: string;
  children: AssertTreeNode[];
}

interface GenerationConfig {
  done: Done;
  resolvers: {[key: string]: ResolutionParam[]};
  resolutionCalls: {
    dependencies: {[key: string]: string};
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
  const { done } = config;
  const resolvers = new Namespace<TestDepResolver>();
  forEach(config.resolvers, (resolveConfig: ResolutionParam[], resolverName: string) => {
    resolvers.setItem(resolverName, new TestDepResolver(resolveConfig));
  });
  const builder = new DepTreeBuilder(resolvers);
  config.resolutionCalls.forEach(({ dependencies }) => {
    return builder.resolveDependencies(convertDependenciesMap(resolvers, dependencies));
  });
  builder.getRoot()
    .then((root) => {
      assertTreeNode(root, config.root);
      done();
    })
    .catch(done);
  getClock().runAll();
}

describe('utils/DepTreeBuilder', () => {
  let clock: SinonFakeTimers;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });
  it('Simple resolution', (done: Done) => {
    generateResolutionTest(() => clock, {
      done,
      resolvers: {
        'npm': [
          {
            description: '^1.0.0',
            time: 100,
            name: 'a',
            dependencies: {
              b: '^1.0.0'
            },
            resolvedVersion: '1.0.1',
          },
          {
            description: '^1.0.0',
            time: 10,
            name: 'b',
            dependencies: {
            },
            resolvedVersion: '1.1.1',
          },
        ]
      },
      resolutionCalls: [
        {
          dependencies: {
            a: '^1.0.0',
          },
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
  describe('Dep conflicts', () => {
    it('a has b which conflicts with root one', (done: Done) => {
      generateResolutionTest(() => clock, {
        done,
        resolvers: {
          'npm': [
            {
              description: '^1.0.0',
              time: 100,
              resolvedVersion: '1.0.1',
              name: 'a',
              dependencies: {
                b: '^2.0.0'
              },
            },
            {
              description: '^2.0.0',
              time: 10,
              resolvedVersion: '2.1.1',
              name: 'b',
              dependencies: {
              },
            },
            {
              description: '^1.0.0',
              time: 10,
              resolvedVersion: '1.1.1',
              name: 'b',
              dependencies: {
              },
            },
          ]
        },
        resolutionCalls: [
          {
            dependencies: {
              a: '^1.0.0',
              b: '^1.0.0',
            },
          },
        ],
        root: {
          children: [
            {
              packageName: 'a',
              packageVersion: '1.0.1',
              children: [
                {
                  packageVersion: '2.1.1',
                  packageName: 'b',
                  children: [],
                }
              ],
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
    it('a has b which conflicts with root one and old b resolves slowly', (done: Done) => {
      generateResolutionTest(() => clock, {
        done,
        resolvers: {
          'npm': [
            {
              description: '^1.0.0',
              time: 100,
              resolvedVersion: '1.0.1',
              name: 'a',
              dependencies: {
                b: '^2.0.0'
              },
            },
            {
              description: '^2.0.0',
              time: 10,
              resolvedVersion: '2.1.1',
              name: 'b',
              dependencies: {
              },
            },
            {
              description: '^1.0.0',
              time: 10000,
              resolvedVersion: '1.1.1',
              name: 'b',
              dependencies: {
              },
            },
          ]
        },
        resolutionCalls: [
          {
            dependencies: {
              a: '^1.0.0',
              b: '^1.0.0',
            },
          },
        ],
        root: {
          children: [
            {
              packageName: 'a',
              packageVersion: '1.0.1',
              children: [
                {
                  packageVersion: '2.1.1',
                  packageName: 'b',
                  children: [],
                }
              ],
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
    it('One of concurrency samples', (done: Done) => {
      generateResolutionTest(() => clock, {
        done,
        resolvers: {
          'npm': [
            {
              description: '^1.0.0',
              time: 100,
              resolvedVersion: '1.0.1',
              name: 'a',
              dependencies: {
                c: '^2.0.0'
              },
            },
            {
              description: '^1.0.0',
              time: 10,
              resolvedVersion: '1.1.1',
              name: 'b',
              dependencies: {
                'c': '^1.0.0'
              },
            },
            {
              description: '^2.0.0',
              time: 10000,
              resolvedVersion: '2.1.1',
              name: 'c',
              dependencies: {
              },
            },
            {
              description: '^1.0.0',
              time: 10,
              resolvedVersion: '1.1.1',
              name: 'c',
              dependencies: {
              },
            },
          ]
        },
        resolutionCalls: [
          {
            dependencies: {
              a: '^1.0.0',
              b: '^1.0.0',
            },
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
              children: [
                {
                  packageName: 'c',
                  packageVersion: '1.1.1',
                  children: [],
                }
              ],
            },
            {
              packageName: 'c',
              packageVersion: '2.1.1',
              children: [],
            }
          ],
        },
      });
    });
  });
});
