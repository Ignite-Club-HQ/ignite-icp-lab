// Shared local actor transport for the Candid-shaped harnesses. It deliberately
// dispatches in memory: no network, environment configuration, or live actor
// connectivity is implied by this boundary.

const BASE_PATH = '/icp/api/v2';
const METHOD_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export const LOCAL_ACTOR_CONFIGS = Object.freeze({
  identity: Object.freeze({
    domain: 'identity',
    canisterId: 'lab-identity',
    basePath: BASE_PATH,
  }),
  competition: Object.freeze({
    domain: 'competition',
    canisterId: 'lab-competition',
    basePath: BASE_PATH,
  }),
});

const clone = value => structuredClone(value);

function assertConfig(config) {
  const expected = LOCAL_ACTOR_CONFIGS[config?.domain];
  if (!expected ||
      config.canisterId !== expected.canisterId ||
      config.basePath !== expected.basePath) {
    throw new Error('Unsupported local actor configuration');
  }
}

function assertMethod(method) {
  if (typeof method !== 'string' || !METHOD_PATTERN.test(method)) {
    throw new Error('Invalid local actor method');
  }
}

/**
 * Create a bound transport for one synthetic local actor. The dispatch
 * callback closes over the authenticated caller, so caller identity is not
 * supplied as a method argument.
 */
export function createLocalActorTransport({ config, dispatch }) {
  assertConfig(config);
  if (typeof dispatch !== 'function') {
    throw new Error('Local actor transport requires a dispatch function');
  }

  return {
    config,
    async call(method, args) {
      assertMethod(method);
      return clone(await dispatch({ method, args: clone(args) }));
    },
  };
}
