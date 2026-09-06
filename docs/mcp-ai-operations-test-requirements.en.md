# AI Operations MCP Test Requirements

[English](mcp-ai-operations-test-requirements.en.md) | [简体中文](mcp-ai-operations-test-requirements.md)

## 1. Test Objectives

Verify that optional AI operations capabilities satisfy the following boundaries:

- MCP uses the Streamable HTTP protocol;
- AI clients can read evidence only within authorized scopes;
- Mutation operations only generate plans and cannot execute directly without explicit human approval;
- Pigsty/pgBackRest backup status must originate from a verified inventory;
- Requests, approvals, executions, and recovery verifications correlate with trace IDs, correlation IDs, audit events, and operation receipts.

## 2. Test Scope

### 2.1 Protocol and Transport

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| MCP-P-01 | Initialization | Returns `protocolVersion=2025-06-18`, `serverInfo`, and `capabilities` |
| MCP-P-02 | Statelessness | Responses omit `Mcp-Session-Id`; server does not depend on prior requests |
| MCP-P-03 | Content Type | Non-`application/json` returns HTTP 415 |
| MCP-P-04 | Protocol Version | Unsupported `MCP-Protocol-Version` returns HTTP 400 |
| MCP-P-05 | JSON-RPC | Invalid JSON returns `-32700`; unknown method returns `-32601`; invalid params returns `-32602` |
| MCP-P-06 | Notification | `notifications/initialized` returns HTTP 202 with an empty body |
| MCP-P-07 | Caching | Responses contain `Cache-Control: no-store` |

### 2.2 Authentication and Tenant Isolation

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| MCP-A-01 | Platform Endpoint | `/mcp` is restricted to master/admin credentials |
| MCP-A-02 | Project Endpoint | `/mcp/projects/{ref}` is restricted to the specific project or admin |
| MCP-A-03 | Resource Isolation | Project tokens cannot read backups or metrics belonging to other projects |
| MCP-A-04 | Secret Protection | Tools, resources, and error responses never return tokens, passwords, database URLs, or service-role keys |
| MCP-A-05 | Disabled by Default | No implicit AI behavior occurs without configured AI clients and authorization credentials |

### 2.3 Tools and Resources

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| MCP-T-01 | Capabilities | Tools, resources, scopes, and the `plan_only` write policy are reliably parseable |
| MCP-T-02 | Backup Readiness | Results include stanza, PITR status, readable completed backup count, and latest completed backup |
| MCP-T-03 | Fail-Closed Backup | Missing inventory, unhealthy stanza/repository, or unreadable records must never return `ready` |
| MCP-T-04 | Metrics | Returns Prometheus metrics without leaking authentication credentials |
| MCP-T-05 | Resource Inventory | Admin and project scopes return resources strictly matching authorized boundaries |
| MCP-T-06 | PITR Plan | Returns project, target time, prerequisites, approval requirements, and confirmation string |
| MCP-T-07 | Direct Execution Blocked | MCP calls cannot trigger restore commands, database writes, or cluster failovers |

### 2.4 Change Lifecycle Closure

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| MCP-O-01 | Plan Approval | Every write operation must first generate a plan and undergo explicit human approval |
| MCP-O-02 | Idempotency | Execution APIs use idempotency keys so repeated requests do not cause duplicate mutations |
| MCP-O-03 | Operation Receipt | Returns operation receipts queryable for status, execution outcome, and failure details |
| MCP-O-04 | Outcome Verification | Successful changes require component health read-back and final state evidence |
| MCP-O-05 | Correlated Tracing | Plans, approvals, executions, alerts, rollbacks, and drills link request IDs, trace IDs, and correlation IDs |

## 3. Non-Functional Testing

- Security: Authentication failure, privilege escalation, prompt injection, oversized arguments, malicious URIs, replays, and sensitive information scanning.
- Stability: Concurrent read-only calls, client retries, network disconnects, duplicate notifications, and resumption after service restarts.
- Performance: `initialize`, `tools/list`, and `resources/list` execute without blocking under normal load; backup queries fail closed on timeouts.
- Observability: HTTP statuses, error counters, slow requests, audit events, and operation receipts are searchable and traceable.
- Disaster Recovery: Pigsty/pgBackRest off-host backups, PITR restore drills, and post-recovery business validations must carry independent evidence.

## 4. Required Testing Levels

1. Unit tests: Protocol parsing, scope checks, plan generation, and secret redaction.
2. Route tests: Real Elysia routes, Bearer auth, project isolation, and response headers.
3. Service integration tests: pgBackRest inventory, backup failure states, and PITR plan vs execute boundaries.
4. Security tests: Unauthorized access, replay attacks, injection, sensitive field leaks, and error leaks.
5. Deployment verification: Enable/disable configurations, real MCP client initialize/tools/list/read/call.
6. Recovery verification: Backup restoration, cross-component health checks, trace/SLO/alerting, and rollback evidence.

## 5. Implementation Verification Baseline

The current repository baseline must pass:

```text
management-api typecheck
mcp.server.test.ts
observability.test.ts
backup.service.test.ts
workspace boundaries
business invariants
git diff --check
```

Production releases must additionally present live credentials, a real Pigsty/pgBackRest inventory, an external MCP client verification, and disaster recovery drill evidence; local unit tests cannot substitute for these operational gates.
