import {isObject, isString, mapValues} from 'lodash';
import {Namespace} from '../../Namespace';
import {DependencyResolver} from '../../resolvers/DependencyResolver';
import {PackageDescription} from './PackageDescription';

export function parseDependencyItem(
  resolvers: Namespace<DependencyResolver>,
  dependencyKey: string,
  dependencyDescription: any,
): PackageDescription {
  if (isObject(dependencyDescription)) {
    return dependencyDescription;
  }
  if (!isString(dependencyDescription)) {
    throw new Error('Dependency description should be string or object');
  }
  const semiIndex = dependencyDescription.indexOf(':');
  if (semiIndex === -1) {
    return {
      resolverArgs: {
        packageName: dependencyKey,
        packageVersion: dependencyDescription,
      },
      resolverName: 'npm',
      semVersion: dependencyDescription,
    };
  }
  const resolver = resolvers
    .getItem(dependencyDescription.substring(0, semiIndex));
  return resolver.parseDependencyItem(dependencyKey, dependencyDescription.substring(semiIndex));
}

export function convertDependenciesMap(
  resolvers: Namespace<DependencyResolver>,
  dependencies: {[key: string]: any},
): {[key: string]: PackageDescription } {
  return mapValues(dependencies, (depDescription: any, depKey: string) => {
    return parseDependencyItem(resolvers, depKey, depDescription);
  });
}
