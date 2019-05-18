import {Project} from '../Project';
import {PresidiumeResolver} from '../resolvers/PresidiumeResolver/PresidiumeResolver';
import {applyJSProjectPlugin} from './JSProjectPlugin';

export function applyPraesidiumProjectPlugin(project: Project) {
  applyJSProjectPlugin(project);
  const resolvers = project.ensureNameSpace('resolvers');
  const presidiumeResolver = new PresidiumeResolver({
    publicKeyFile: '/home/alexei/contribution/praesidiume/encryption_proxy/keys/public.key',
    repositoryUrl: 'http://localhost:3000',
    resolverName: 'npm',
  });
  resolvers.setItem('npm', presidiumeResolver);
}
