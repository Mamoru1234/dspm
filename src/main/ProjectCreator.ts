import {isPlainObject, mapValues} from 'lodash';
import {Provider} from 'nconf';
import {join} from 'path';
import {Project} from './Project';

function protectCicles(projectPath: string, evaluatedPaths: string[]) {
  if (evaluatedPaths.indexOf(projectPath) !== -1) {
    throw new Error(`${projectPath} is already in evaluation ${JSON.stringify(evaluatedPaths)}`);
  }
}

type ProjectConfigurator = (project: Project) => void;

function isSimpleConfiguration(configuration: any): configuration is ProjectConfigurator {
  return typeof configuration === 'function';
}

interface ProjectConfig {
  configurator: ProjectConfigurator;
  subProjects: {[key: string]: string};
}

function isComplexConfiguration(configuration: any): configuration is ProjectConfig {
  return typeof configuration.configurator === 'function' && isPlainObject(configuration.subProjects);
}

function createProject(projectPath: string, evaluatedPaths: string[]): Project {
  protectCicles(projectPath, evaluatedPaths);
  const provider = new Provider();

  provider
    .env()
    .argv();

  const project = new Project(provider, projectPath);

  const configuration = require(join(projectPath, './dspm.config.js'));
  if (isSimpleConfiguration(configuration)) {
    configuration(project);
    return project;
  }
  if (isComplexConfiguration(configuration)) {
    const newEvaluatedPath = evaluatedPaths.concat(projectPath);
    const subProjects = mapValues(configuration.subProjects, (subPath) => {
      return createProject(join(projectPath, subPath), newEvaluatedPath);
    });
    project.setSubProjects(subProjects);
    configuration.configurator(project);
    return project;
  }
  throw new Error('Wrong configuration');
}

export class ProjectCreator {
  public static createProject(projectPath: string): Project {
    return createProject(projectPath, []);
  }
}
