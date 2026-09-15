export type LocalActorDomain = "identity" | "competition";

export interface LocalActorConfig {
  domain: LocalActorDomain;
  canisterId: string;
  basePath: "/icp/api/v2";
}

export interface LocalActorCall {
  method: string;
  args: unknown;
}

export interface LocalActorTransport {
  readonly config: LocalActorConfig;
  call<T>(method: string, args: unknown): Promise<T>;
  exportSnapshot(): LocalActorTransportSnapshot;
  importSnapshot(snapshot: unknown): void;
}

export type LocalActorDispatch = (call: LocalActorCall) => Promise<unknown>;

export interface LocalActorTransportSnapshot {
  schemaVersion: 1;
  config: LocalActorConfig;
  nextSequence: number;
  requests: Array<{
    key: string;
    method: string;
    requestId: string;
    fingerprint: string;
    result: unknown;
  }>;
}

export type LocalActorTransportFactory = (options: {
  config: LocalActorConfig;
  dispatch: LocalActorDispatch;
}) => LocalActorTransport;
