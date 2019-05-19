import detect from 'detect-libc';

const PARAMETER_RESOLVERS: {[type: string]: () => string} = {
  arch: () => process.arch,
  libc: () => detect.family || 'unknown',
  node_abi: () => `node-v${process.versions.modules}`,
  platform: () => process.platform,
  runtime: () => 'node',
};

export function resolveParams(paramNames: string[]): {[key: string]: string} {
  const result: {[key: string]: string} = {};
  paramNames.forEach((name) => {
    const resolver = PARAMETER_RESOLVERS[name];
    if (!resolver) {
      throw new Error(`Unknown parameter ${name}`);
    }
    result[name] = resolver();
  });
  return result;
}
