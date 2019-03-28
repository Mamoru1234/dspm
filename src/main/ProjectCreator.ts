import {props} from 'bluebird';
import fs from 'fs-extra';
import {get, has, mapValues} from 'lodash';
import {Provider} from 'nconf';
import {join} from 'path';
import {applyJSProjectPlugin} from './plugins/JSProjectPlugin';
import {applyNpmPlugin} from './plugins/NpmPlugin';
import {Project} from './Project';

function protectCicles(projectPath: string, evaluatedPaths: string[]) {
  if (evaluatedPaths.indexOf(projectPath) !== -1) {
    throw new Error(`${projectPath} is already in evaluation ${JSON.stringify(evaluatedPaths)}`);
  }
}

type ProjectConfigurator = (project: Project) => void;

function isConfiguration(configuration: any): configuration is ProjectConfigurator {
  return typeof configuration === 'function';
}

const ENV_PREFIX = 'DSPM_';

const envTransform = ({ key, value }: {key: string, value: string}) => {
  if (key.startsWith(ENV_PREFIX)) {
    return {
      key: key.substring(ENV_PREFIX.length),
      value,
    };
  }
  return false;
};

const PLUGINS: any = {
  jsProject: applyJSProjectPlugin,
  npm: applyNpmPlugin,
};

async function getPackageInfo(project: Project): Promise<any> {
  const packageInfoPath = join(project.getProjectPath(), 'package.json');
  const hasJson = await fs.pathExists(packageInfoPath);
  if (!hasJson) {
    throw new Error(`No package.json in: ${project.getProjectPath()}`);
  }
  return await fs.readJson(packageInfoPath);
}

function applyPlugins(project: Project, packageInfo: any, plugins: any) {
  if (!has(packageInfo, 'dspm.plugins')) {
    throw new Error(`You should define dspm.plugins section as at least empty array`);
  }
  const pluginsNames: string[] = get(packageInfo, 'dspm.plugins');
  pluginsNames.forEach((pluginName: string) => {
    if (!has(plugins, pluginName)) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }
    plugins[pluginName](project);
  });
}

async function ensureSubProjects(project: Project, packageInfo: any, evaluatedPaths: string[]) {
  if (!has(packageInfo, 'dspm.subProjects')) {
    return;
  }
  const newEvaluatedPath = evaluatedPaths.concat(project.getProjectPath());
  const subProjects = mapValues(get(packageInfo, 'dspm.subProjects'), (subPath) => {
    return createProject(join(project.getProjectPath(), subPath), newEvaluatedPath);
  });
  project.setSubProjects(await props(subProjects));
}

async function createProject(projectPath: string, evaluatedPaths: string[]): Promise<Project> {
  protectCicles(projectPath, evaluatedPaths);
  const provider = new Provider();
  provider
    .env({
      separator: '_',
      transform: envTransform,
    })
    .argv();

  const project = new Project(provider, projectPath);

  const packageInfo = await getPackageInfo(project);

  applyPlugins(project, packageInfo, PLUGINS);

  await ensureSubProjects(project, packageInfo, evaluatedPaths);

  const configuration = require(join(projectPath, './dspm.config.js'));

  if (isConfiguration(configuration)) {
    configuration(project);
    return project;
  }
  throw new Error('Wrong configuration');
}

export class ProjectCreator {
  public static createProject(projectPath: string): Promise<Project> {
    return createProject(projectPath, []);
  }
}
