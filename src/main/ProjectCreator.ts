import {props} from 'bluebird';
import fs from 'fs-extra';
import {get, has, mapValues} from 'lodash';
import {Provider} from 'nconf';
import {join} from 'path';
import {applyJSProjectPlugin} from './plugins/JSProjectPlugin';
import {applyNpmPlugin} from './plugins/NpmPlugin';
import {applyPraesidiumProjectPlugin} from './plugins/PraesidiumProjectPlugin';
import {Project} from './Project';

function protectCircles(projectPath: string, evaluatedPaths: string[]) {
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
  praesidiumProject: applyPraesidiumProjectPlugin,
};

async function getPackageInfo(projectPath: string): Promise<any> {
  const packageInfoPath = join(projectPath, 'package.json');
  const hasJson = await fs.pathExists(packageInfoPath);
  if (!hasJson) {
    throw new Error(`No package.json in: ${projectPath}`);
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

async function evalConfiguration(project: Project) {
  const configPath = join(project.getProjectPath(), './dspm.config.js');
  if (!(await fs.pathExists(configPath))) {
    return;
  }
  const configuration = require(configPath);
  if (isConfiguration(configuration)) {
    configuration(project);
    return;
  }
  throw new Error('Wrong configuration format');
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
  protectCircles(projectPath, evaluatedPaths);
  const provider = new Provider();
  provider
    .env({
      separator: '_',
      transform: envTransform,
    })
    .argv();

  const packageInfo = await getPackageInfo(projectPath);

  const project = new Project(provider, packageInfo, projectPath);

  applyPlugins(project, packageInfo, PLUGINS);

  await ensureSubProjects(project, packageInfo, evaluatedPaths);
  await evalConfiguration(project);
  return project;
}

export class ProjectCreator {
  public static createProject(projectPath: string): Promise<Project> {
    return createProject(projectPath, []);
  }
}
