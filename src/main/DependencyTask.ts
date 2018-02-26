import {Task} from "./Task";
import {NpmDependencyResolver} from "./resolvers/NpmDependencyResolver";
import {Project} from "./Project";

export class DependencyTask extends Task {
  private packages: {[key:string]: Array<string>} = {};
  constructor(
    private dependencyResolvers: {[key: string]: NpmDependencyResolver},
    name: string,
    project: Project
  ) {
    super(name, project);
  }

  public dependency(resolver: string, ...packageNames: Array<string>) {
    this.packages[resolver] = (this.packages[resolver] || []).concat(packageNames);
  }

  public exec(): Promise<any> {
    const resolverNames = Object.keys(this.packages);
    return Promise.all(resolverNames.map((resolverName) => {
      return Promise.all(this.packages[resolverName]
        .map((packageName) => this.dependencyResolvers[resolverName].getMetaData(packageName)));
    }));
  }
}

export function createDepTask(project: Project, name: string, dependencyResolvers: {[key: string]: NpmDependencyResolver}, configurator: (task: DependencyTask) => void): DependencyTask {
  const task = new DependencyTask(dependencyResolvers, name, project);
  configurator(task);
  project.setTask(name, task);
  return task;
}


export function refineDepTask(project: Project, name: string, configurator: (task: DependencyTask) => void): DependencyTask {
  const task = project.getTask(name) as DependencyTask;
  configurator(task);
  return task;
}
