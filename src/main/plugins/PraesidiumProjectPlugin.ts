import { get, has } from 'lodash';
import {join} from 'path';
import {Project} from '../Project';
import {PresidiumeResolver} from '../resolvers/PresidiumeResolver/PresidiumeResolver';
import {applyJSProjectPlugin} from './JSProjectPlugin';

export function applyPraesidiumProjectPlugin(project: Project) {
  applyJSProjectPlugin(project);
  const resolvers = project.ensureNameSpace('resolvers');
  const packageJson = require(join(project.getProjectPath(), 'package.json'));
  if (!has(packageJson, 'dspm.presidiume')) {
    throw new Error('presidiume config is required');
  }
  const config = get(packageJson, 'dspm.presidiume');
  const defaultMaxSize = 1024 * 100;
  const timeout = get(config, 'timeout', 60 * 30);
  const presidiumeResolver = new PresidiumeResolver({
    packageSizeLimit: config.maxSize || defaultMaxSize,
    publicKeyFile: config.publicKey,
    repositoryUrl: config.repository,
    requestTimeout: timeout * 1000,
    resolverName: 'npm',
  });
  resolvers.setItem('npm', presidiumeResolver);
}
