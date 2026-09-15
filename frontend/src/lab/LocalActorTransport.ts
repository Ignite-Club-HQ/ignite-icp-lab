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
}

export type LocalActorDispatch = (call: LocalActorCall) => Promise<unknown>;

export type LocalActorTransportFactory = (options: {
  config: LocalActorConfig;
  dispatch: LocalActorDispatch;
}) => LocalActorTransport;
