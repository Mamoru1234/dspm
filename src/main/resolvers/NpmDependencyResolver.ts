import { get } from 'request-promise';
import {log} from "util";

export class NpmDependencyResolver {
  constructor(private repositoryURL: string = 'https://registry.npmjs.org') {}

  public getMetaData(packageName: string): any {
    return get(`${this.repositoryURL}/${packageName}`).then((res) => {
      log(res);
    })
  }
}