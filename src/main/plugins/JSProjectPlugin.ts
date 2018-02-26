import {Project} from "../Project";
import {createDepTask} from "../DependencyTask";
import {NpmDependencyResolver} from "../resolvers/NpmDependencyResolver";

export function applyJSProjectPlugin(project: Project) {
  const resolver = new NpmDependencyResolver();
  createDepTask(project, 'install', {npm: resolver}, () => {});
}