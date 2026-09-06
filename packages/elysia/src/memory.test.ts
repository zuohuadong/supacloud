import { describe, expect, test } from "bun:test";
import { t } from "elysia";
import {
  createMemorySandbox,
  type CompiledModule,
  type MemorySandbox,
} from "./index";
import { createMemoryPolicy } from "./memory_policy";

class MemoryController {
  hello(input: { requestContext: { requestId: string; identity: { subject?: string } } }) {
    return {
      requestId: input.requestContext.requestId,
      subject: input.requestContext.identity.subject ?? null,
    };
  }
}

function createModule(): CompiledModule {
  return {
    name: "memory",
    createServices: () => ({}),
    createRequestScope: () => ({
      memoryController: new MemoryController(),
    }),
    controllers: [{
      path: "/memory",
      serviceKey: "memoryController",
      scope: "request",
      routes: [{
        method: "GET",
        path: "/hello",
        handler: "hello",
        response: t.Object({
          requestId: t.String(),
          subject: t.Union([t.String(), t.Null()]),
        }),
      }],
    }],
    commands: [],
  };
}

describe("createMemorySandbox", () => {
  test("provides deterministic request context and in-process HTTP", async () => {
    const sandbox = createMemorySandbox({
      modules: [createModule()],
      identity: { authenticated: true, subject: "user-1" },
      requestId: "test-request",
    });

    const response = await sandbox.request("/memory/hello");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      requestId: "test-request",
      subject: "user-1",
    });
  });

  test("supports deterministic transaction rollback", async () => {
    const sandbox = createMemorySandbox();
    sandbox.db.set("cases", "1", { title: "before" });

    await expect(sandbox.db.transaction(async (tx) => {
      tx.set("cases", "1", { title: "after" });
      tx.set("cases", "2", { title: "new" });
      throw new Error("rollback");
    })).rejects.toThrow("rollback");

    expect(sandbox.db.get("cases", "1")).toEqual({ title: "before" });
    expect(sandbox.db.get("cases", "2")).toBeUndefined();
  });

  test("isolates storage reads and reset clears all state", () => {
    const sandbox: MemorySandbox = createMemorySandbox();
    sandbox.storage.put("evidence", "a.txt", "hello", {
      contentType: "text/plain",
      metadata: { source: "test" },
    });

    const object = sandbox.storage.get("evidence", "a.txt");
    expect(object?.contentType).toBe("text/plain");
    expect(new TextDecoder().decode(object?.body)).toBe("hello");
    object?.body.fill(0);
    expect(new TextDecoder().decode(sandbox.storage.get("evidence", "a.txt")?.body)).toBe("hello");

    sandbox.reset();
    expect(sandbox.db.list("cases")).toEqual([]);
    expect(sandbox.storage.list("evidence")).toEqual([]);
  });

  test("exposes deterministic policy, idempotency and storage failure adapters", () => {
    const sandbox = createMemorySandbox();
    sandbox.policy.grant("user-1", "case.read");
    expect(sandbox.policy.can("user-1", "case.read")).toBe(true);
    expect(sandbox.policy.can("user-1", "case.write")).toBe(false);
    expect(sandbox.policy.claimIdempotency("user-1", "once")).toBe(true);
    expect(sandbox.policy.claimIdempotency("user-1", "once")).toBe(false);
    sandbox.storage.failNext(new Error("offline"));
    expect(() => sandbox.storage.put("evidence", "x", "x")).toThrow("offline");
  });

  test("replays identical receipts and rejects input conflicts", async () => {
    const policy = createMemoryPolicy();
    let executions = 0;
    const work = () => {
      executions += 1;
      return { ok: true };
    };
    await expect(policy.runOnce("user-1", "case.accept", "k", { id: "1" }, work)).resolves.toEqual({ ok: true });
    await expect(policy.runOnce("user-1", "case.accept", "k", { id: "1" }, work)).resolves.toEqual({ ok: true });
    expect(executions).toBe(1);
    await expect(policy.runOnce("user-1", "case.accept", "k2", { z: 2, a: 1 }, work)).resolves.toEqual({ ok: true });
    await expect(policy.runOnce("user-1", "case.accept", "k2", { a: 1, z: 2 }, work)).resolves.toEqual({ ok: true });
    expect(executions).toBe(2);
    await expect(policy.runOnce("user-1", "case.accept", "k", { id: "2" }, work)).rejects.toThrow("Idempotency input conflict");
  });
});
