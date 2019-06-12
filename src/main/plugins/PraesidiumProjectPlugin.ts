import { get, has } from 'lodash';
import {Project} from '../Project';
import {PresidiumeResolver} from '../resolvers/PresidiumeResolver/PresidiumeResolver';
import {applyJSProjectPlugin} from './JSProjectPlugin';

export function applyPraesidiumProjectPlugin(project: Project) {
  applyJSProjectPlugin(project);
  const resolvers = project.ensureNameSpace('resolvers');
  const packageJson = project.getPackageJson();
  if (!has(packageJson, 'dspm.presidiume')) {
    throw new Error('presidiume config is required');
  }
  const config = get(packageJson, 'dspm.presidiume');
  const defaultMaxSize = 1024 * 100;
  const timeout = get(config, 'timeout', 60 * 15) * 1000;
  const presidiumeResolver = new PresidiumeResolver({
    packageSizeLimit: config.maxSize || defaultMaxSize,
    publicKeyFile: config.publicKey,
    repositoryUrl: config.repository,
    requestTimeout: timeout,
    resolverName: 'npm',
  });
  resolvers.setItem('npm', presidiumeResolver);
}
