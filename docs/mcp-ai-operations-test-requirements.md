# AI 运维 MCP 测试需求

## 1. 测试目标

验证可选 AI 运维能力满足以下边界：

- MCP 使用新版无状态 Streamable HTTP 协议；
- AI 客户端只能读取授权范围内的证据；
- 变更操作只能生成计划，不能绕过审批直接执行；
- Pigsty/pgBackRest 备份状态必须来自已验证的 inventory；
- 请求、审批、执行和恢复验证能够关联 trace、correlation、审计和操作回执。

## 2. 测试范围

### 2.1 协议与传输

| 编号 | 需求 | 验收标准 |
| --- | --- | --- |
| MCP-P-01 | 初始化 | 返回 `protocolVersion=2025-06-18`、serverInfo 和 capabilities |
| MCP-P-02 | 无状态 | 任意响应不包含 `Mcp-Session-Id`；服务端不依赖前一次请求 |
| MCP-P-03 | 内容类型 | 非 `application/json` 返回 HTTP 415 |
| MCP-P-04 | 协议版本 | 不支持的 `MCP-Protocol-Version` 返回 HTTP 400 |
| MCP-P-05 | JSON-RPC | 非法 JSON 返回 `-32700`；未知方法返回 `-32601`；非法参数返回 `-32602` |
| MCP-P-06 | 通知 | `notifications/initialized` 返回 HTTP 202 且无响应体 |
| MCP-P-07 | 缓存 | 响应包含 `Cache-Control: no-store` |

### 2.2 认证与租户隔离

| 编号 | 需求 | 验收标准 |
| --- | --- | --- |
| MCP-A-01 | 平台接口 | `/mcp` 仅允许 master/admin |
| MCP-A-02 | 项目接口 | `/mcp/projects/{ref}` 仅允许该项目或 admin |
| MCP-A-03 | 资源隔离 | 项目 token 不能读取其他项目的 backups/metrics |
| MCP-A-04 | 机密保护 | 工具、资源和错误响应不返回 token、密码、数据库 URL 或 service-role key |
| MCP-A-05 | 默认关闭 | 未配置 AI 客户端或授权凭据时，不产生隐式 AI 行为 |

### 2.3 工具与资源

| 编号 | 需求 | 验收标准 |
| --- | --- | --- |
| MCP-T-01 | capabilities | 工具、资源、scope 和 `plan_only` 策略稳定可解析 |
| MCP-T-02 | 备份就绪度 | 结果包含 stanza、PITR 状态、可读完成备份数量和最新备份 |
| MCP-T-03 | 备份失败关闭 | inventory 缺失、stanza/repository unhealthy 或记录不可读时不得返回 ready |
| MCP-T-04 | 指标 | 返回 Prometheus 指标，且不泄漏认证信息 |
| MCP-T-05 | 资源清单 | admin 和 project scope 返回符合授权范围的资源 |
| MCP-T-06 | PITR 计划 | 返回项目、目标时间、前置条件、审批要求和确认字符串 |
| MCP-T-07 | PITR 禁止直执 | MCP 调用不得触发 restore 命令、数据库写入或集群切换 |

### 2.4 变更闭环

| 编号 | 需求 | 验收标准 |
| --- | --- | --- |
| MCP-O-01 | 计划审批 | 任何写操作必须先形成计划并经过显式人工审批 |
| MCP-O-02 | 幂等性 | 执行 API 使用 idempotency key，重复请求不会重复变更 |
| MCP-O-03 | 操作回执 | 返回 operation/receipt，可查询状态、结果和失败原因 |
| MCP-O-04 | 结果验证 | 变更成功必须有组件健康 read-back 和最终状态证据 |
| MCP-O-05 | 关联追踪 | 计划、审批、执行、告警、回滚和恢复演练关联 request ID、trace ID、correlation ID |

## 3. 非功能测试

- 安全：认证失败、越权、提示注入、超长参数、恶意 URI、重放和敏感信息扫描。
- 稳定性：并发只读调用、客户端重试、网络断开、重复 notification、服务重启后继续请求。
- 性能：`initialize`、`tools/list`、`resources/list` 在正常负载下无明显阻塞；备份查询超时必须失败关闭。
- 可观测性：HTTP 状态、错误计数、慢请求、审计事件和操作回执可检索。
- 灾备：Pigsty/pgBackRest 异地备份、PITR 恢复演练和恢复后业务验收必须有独立证据。

## 4. 必须执行的测试层级

1. 单元测试：协议解析、scope 判断、计划生成、机密脱敏。
2. 路由测试：真实 Elysia route、Bearer auth、项目隔离和响应头。
3. 服务集成测试：pgBackRest inventory、备份异常、PITR plan/execute 边界。
4. 安全测试：越权、重放、注入、敏感字段和错误信息泄漏。
5. 部署验收：启用/禁用配置、真实 MCP 客户端 initialize/tools/list/read/call。
6. 灾备验收：备份恢复、跨组件健康检查、trace/SLO/告警和回滚证据闭环。

## 5. 当前实现验收基线

本次提交应至少通过：

```text
management-api typecheck
mcp.server.test.ts
observability.test.ts
backup.service.test.ts
workspace boundaries
business invariants
git diff --check
```

生产发布前还必须补充真实凭据、真实 Pigsty/pgBackRest inventory、外部 MCP 客户端和恢复演练证据；本地单元测试不能替代这些验收。
