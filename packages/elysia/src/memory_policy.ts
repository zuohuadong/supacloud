import { ApplicationError } from "./index";

export interface MemoryPolicy {
  grant(subject: string, permission: string): void;
  revoke(subject: string, permission: string): void;
  can(subject: string, permission: string): boolean;
  claimIdempotency(subject: string, key: string): boolean;
  subject(context: unknown): string;
  runOnce<T>(subject: string, command: string, key: string, input: unknown, work: () => T | Promise<T>): Promise<T>;
  clear(): void;
}

/** Test-only grants and successful-result receipts, scoped by subject and command. */
export function createMemoryPolicy(): MemoryPolicy {
  const permissions = new Map<string, Set<string>>();
  const receipts = new Map<string, { input: string; result: Promise<unknown> }>();
  return {
    grant(subject, permission) {
      const values = permissions.get(subject) ?? new Set<string>();
      values.add(permission);
      permissions.set(subject, values);
    },
    revoke(subject, permission) { permissions.get(subject)?.delete(permission); },
    can(subject, permission) { return permissions.get(subject)?.has(permission) ?? false; },
    claimIdempotency(subject, key) {
      const id = JSON.stringify([subject, key]);
      if (receipts.has(id)) return false;
      receipts.set(id, { input: "", result: Promise.resolve(undefined) });
      return true;
    },
    subject(context) {
      if (typeof context === "object" && context !== null && "identity" in context) {
        const identity = context.identity;
        if (typeof identity === "object" && identity !== null && "authenticated" in identity &&
          identity.authenticated === true && "subject" in identity && typeof identity.subject === "string" &&
          identity.subject.length > 0) return identity.subject;
      }
      throw new ApplicationError("Memory authenticated identity required", { status: 401, code: "MEMORY_IDENTITY_REQUIRED" });
    },
    async runOnce<T>(subject: string, command: string, key: string, input: unknown, work: () => T | Promise<T>): Promise<T> {
      if (!subject || !command || !key) throw new Error("Memory receipt requires subject, command and key");
      const id = JSON.stringify([subject, command, key]);
      const fingerprint = stableStringify(input);
      const existing = receipts.get(id);
      if (existing) {
        if (existing.input !== fingerprint) {
          throw new ApplicationError("Idempotency input conflict", { status: 409, code: "MEMORY_IDEMPOTENCY_CONFLICT" });
        }
        return structuredClone(await existing.result) as T;
      }
      const result = Promise.resolve().then(work).then((value) => structuredClone(value));
      const entry = { input: fingerprint, result };
      receipts.set(id, entry);
      try {
        return structuredClone(await result);
      } catch (error) {
        if (receipts.get(id) === entry) receipts.delete(id);
        throw error;
      }
    },
    clear() { permissions.clear(); receipts.clear(); },
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
