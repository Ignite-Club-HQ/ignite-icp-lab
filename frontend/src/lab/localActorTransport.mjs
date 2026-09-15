// Shared local actor transport for the Candid-shaped harnesses. It deliberately
// dispatches in memory: no network, environment configuration, or live actor
// connectivity is implied by this boundary.

const BASE_PATH = '/icp/api/v2';
const METHOD_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_REQUEST_ID_LENGTH = 120;
const MAX_LEDGER_ENTRIES = 256;
const MAX_SNAPSHOT_BYTES = 128 * 1024;
const SNAPSHOT_SCHEMA_VERSION = 1;

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

function serialized(value, label) {
  try {
    return JSON.stringify(value);
  } catch {
    throw new Error(`${label} must be serializable`);
  }
}

function snapshotSize(snapshot) {
  const text = serialized(snapshot, 'Transport snapshot');
  return new TextEncoder().encode(text).byteLength;
}

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

function requestDetails(method, args) {
  const requestId = args && typeof args === 'object' && typeof args.request_id === 'string'
    ? args.request_id.trim()
    : '';
  if (!requestId) return null;
  if (requestId.length > MAX_REQUEST_ID_LENGTH) {
    throw new Error('Transport request ID too long');
  }
  return {
    key: `${method}:${requestId}`,
    method,
    requestId,
    fingerprint: serialized(args, 'Transport request arguments'),
  };
}

function validateSnapshot(snapshot, config) {
  if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error('Unsupported local actor transport snapshot');
  }
  assertConfig(snapshot.config);
  if (snapshot.config.domain !== config.domain ||
      snapshot.config.canisterId !== config.canisterId ||
      snapshot.config.basePath !== config.basePath) {
    throw new Error('Local actor transport snapshot configuration mismatch');
  }
  if (!Number.isSafeInteger(snapshot.nextSequence) || snapshot.nextSequence < 0) {
    throw new Error('Local actor transport snapshot sequence invalid');
  }
  if (!Array.isArray(snapshot.requests) || snapshot.requests.length > MAX_LEDGER_ENTRIES) {
    throw new Error('Local actor transport snapshot request limit exceeded');
  }
  const keys = new Set();
  const requests = snapshot.requests.map(request => {
    if (!request || typeof request.key !== 'string' || !request.key.trim() ||
        typeof request.method !== 'string' || !METHOD_PATTERN.test(request.method) ||
        typeof request.requestId !== 'string' || !request.requestId.trim() ||
        request.requestId.length > MAX_REQUEST_ID_LENGTH ||
        typeof request.fingerprint !== 'string' || !request.fingerprint.trim()) {
      throw new Error('Invalid local actor transport snapshot request');
    }
    if (request.key !== `${request.method}:${request.requestId}`) {
      throw new Error('Invalid local actor transport snapshot request key');
    }
    if (keys.has(request.key)) {
      throw new Error('Duplicate local actor transport request');
    }
    keys.add(request.key);
    structuredClone(request.result);
    return {
      key: request.key,
      method: request.method,
      requestId: request.requestId,
      fingerprint: request.fingerprint,
      result: clone(request.result),
    };
  });
  const normalized = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    config: clone(config),
    nextSequence: snapshot.nextSequence,
    requests: requests.sort((a, b) => a.key.localeCompare(b.key)),
  };
  if (snapshotSize(normalized) > MAX_SNAPSHOT_BYTES) {
    throw new Error('Local actor transport snapshot size exceeded');
  }
  return normalized;
}

/**
 * Create a bound transport for one synthetic local actor. The dispatch
 * callback closes over the authenticated caller, so caller identity is not
 * supplied as a method argument. Request IDs are checkpointed for bounded
 * retry replay; domain state remains owned by the provider-neutral service.
 */
export function createLocalActorTransport({ config, dispatch, snapshot = null }) {
  assertConfig(config);
  if (typeof dispatch !== 'function') {
    throw new Error('Local actor transport requires a dispatch function');
  }

  let nextSequence = 0;
  const requests = new Map();
  if (snapshot != null) {
    const restored = validateSnapshot(snapshot, config);
    nextSequence = restored.nextSequence;
    for (const request of restored.requests) requests.set(request.key, request);
  }

  const transport = {
    config,
    async call(method, args) {
      assertMethod(method);
      const details = requestDetails(method, args);
      if (details) {
        const previous = requests.get(details.key);
        if (previous) {
          if (previous.fingerprint !== details.fingerprint) {
            throw new Error('Transport request ID was reused with different input');
          }
          return clone(previous.result);
        }
        if (requests.size >= MAX_LEDGER_ENTRIES) {
          throw new Error('Transport request ledger limit exceeded');
        }
      }
      const result = clone(await dispatch({ method, args: clone(args) }));
      nextSequence += 1;
      if (details) requests.set(details.key, {
        ...details,
        result: clone(result),
      });
      return result;
    },
    exportSnapshot() {
      const snapshot = {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        config: clone(config),
        nextSequence,
        requests: [...requests.values()].map(clone).sort((a, b) => a.key.localeCompare(b.key)),
      };
      if (snapshotSize(snapshot) > MAX_SNAPSHOT_BYTES) {
        throw new Error('Local actor transport snapshot size exceeded');
      }
      return clone(snapshot);
    },
    importSnapshot(nextSnapshot) {
      const restored = validateSnapshot(nextSnapshot, config);
      requests.clear();
      for (const request of restored.requests) requests.set(request.key, request);
      nextSequence = restored.nextSequence;
    },
  };
  return transport;
}
