export type TelemetryAttributes = Record<string, string | number | boolean | null>;

export type TelemetryEvent = {
  name: string;
  value?: number;
  attributes: TelemetryAttributes;
};

export type TelemetrySink = (event: TelemetryEvent) => void;

const sensitiveKey = /(^|_)(access|authorization|cookie|key|password|secret|token|user_id)(_|$)/i;
const maxAttributeLength = 128;

function sanitizeAttributes(attributes: Record<string, unknown>): TelemetryAttributes {
  const sanitized: TelemetryAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (sensitiveKey.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      sanitized[key] = value.slice(0, maxAttributeLength);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class ProviderNeutralTelemetry {
  constructor(
    private readonly sink: TelemetrySink = () => {},
    private readonly sampleRate = 1,
    private readonly random = Math.random,
  ) {}

  record(name: string, attributes: Record<string, unknown> = {}, value?: number): void {
    if (this.sampleRate <= 0 || this.random() >= this.sampleRate) {
      return;
    }
    this.sink({
      name,
      ...(value === undefined ? {} : { value }),
      attributes: sanitizeAttributes(attributes),
    });
  }
}

export const telemetry = new ProviderNeutralTelemetry();
