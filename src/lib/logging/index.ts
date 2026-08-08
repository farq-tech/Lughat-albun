type LogFields = {
  requestId?: string;
  orderId?: string;
  publicOrderNumber?: number;
  event: string;
  actorId?: string | null;
  level?: "info" | "warn" | "error";
  [key: string]: unknown;
};

const SENSITIVE_KEYS = [
  "serviceRoleKey",
  "service_role",
  "accessToken",
  "access_token",
  "card",
  "pan",
  "cvv",
  "phone",
];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

export function log(fields: LogFields) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: fields.level ?? "info",
    ...(redact(fields) as Record<string, unknown>),
  };
  const line = JSON.stringify(payload);
  if (fields.level === "error") console.error(line);
  else if (fields.level === "warn") console.warn(line);
  else console.log(line);
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
