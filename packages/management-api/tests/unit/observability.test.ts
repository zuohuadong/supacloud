import { afterEach, describe, expect, test } from "bun:test";
import {
  applyObservabilityHeaders,
  beginRequestObservability,
  recordRequestObservation,
  renderRequestMetrics,
  resetRequestMetricsForTests,
} from "../../src/utils/observability";

afterEach(() => {
  resetRequestMetricsForTests();
});

describe("request observability", () => {
  test("preserves a valid inbound request and trace identity", () => {
    const request = new Request("http://localhost/health", {
      headers: {
        "x-request-id": "req-123",
        "x-supacloud-correlation-id": "workflow-123",
        traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
      },
    });
    const context = beginRequestObservability(request);
    const headers: Record<string, string | number> = {};

    applyObservabilityHeaders(headers, context);

    expect(context.requestId).toBe("req-123");
    expect(context.traceId).toBe("0123456789abcdef0123456789abcdef");
    expect(context.correlationId).toBe("workflow-123");
    expect(headers).toEqual({
      "x-request-id": "req-123",
      "x-supacloud-trace-id": "0123456789abcdef0123456789abcdef",
      "x-supacloud-correlation-id": "workflow-123",
    });
  });

  test("rejects unsafe inbound identifiers and records Prometheus metrics", () => {
    const request = new Request("http://localhost/failure", {
      headers: {
        "x-request-id": "bad value",
        "x-supacloud-trace-id": "not-a-trace",
      },
    });
    const context = beginRequestObservability(request);
    recordRequestObservation(request, 503);
    const metrics = renderRequestMetrics();

    expect(context.requestId).not.toBe("bad value");
    expect(context.traceId).not.toBe("not-a-trace");
    expect(metrics).toContain("supacloud_management_http_requests_total 1");
    expect(metrics).toContain("supacloud_management_http_errors_total 1");
    expect(metrics).toContain('supacloud_management_http_responses_total{status="503"} 1');
  });
});
