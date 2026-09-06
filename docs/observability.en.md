# Observability Baseline with Optional Grafana

[English](observability.en.md) | [简体中文](observability.md)

SupaCloud's default logging baseline is **VictoriaLogs + in-process collector**. Bare-metal and host installations run a single native systemd service; Docker Compose deployments run a pinned, standalone VictoriaLogs container with a persistent volume. Log collection runs inside the existing SupaCloud management process, without introducing Vector, Logflare, Analytics, or external collector sidecars. It operates independently of PostgreSQL, Pigsty, and Grafana.

```text
systemd journal
  -> SupaCloud built-in collector
Edge Function .logs
  -> SupaCloud built-in collector
  -> VictoriaLogs (127.0.0.1:9428, dedicated disk directory)
  -> VictoriaLogs Web UI / HTTP API
  -> Grafana (optional data source)
```

## Specifications

- Do not deploy Supabase Analytics, Logflare, or their Vector-to-Logflare pipeline in new installations.
- `SUPACLOUD_INSTALL_LEGACY_SUPABASE_STACK=true` is rejected by the installer because the legacy Compose stack pulls in Analytics.
- Do not write application, tenant, or management logs to PostgreSQL databases.
- Grafana serves only as an optional dashboard and alerting UI; log ingestion, storage, and querying must never depend on Grafana being online.
- VictoriaLogs listens strictly on `127.0.0.1:9428`. Remote access must pass through a controlled reverse proxy, VPN, or dedicated authentication layer, never an exposed public port.
- The built-in collector filters SupaCloud and Patroni/PostgreSQL units from journald, and reads Edge Function `.logs/*.log` files. Tenant-scoped GoTrue, PostgREST, Storage units, and function log paths are resolved into `project_ref` and `service` for tenant-isolated queries in the project logs UI.
- The built-in collector redacts Authorization headers, Cookies, JWTs, tokens, and database connection strings before persisting logs, retaining only log bodies, timestamps, and systemd units. No service should bypass this collector to write directly to the log database.
- Ingestion cursors and function file offsets are stored in `/var/lib/supacloud/log-collector/state.json`. The cursor advances only after writes succeed; restarting the management process resumes from this recorded offset. On initial startup, it backfills at most the last 15 minutes of journald and the last 1 MiB of each function log file to prevent accidental mass replay.

## Grafana Subpath Proxy

The Management API reverse-proxies Grafana under the public `/grafana` prefix (`GRAFANA_URL`, default `http://127.0.0.1:3000/grafana`). Grafana must be served from the identical subpath, or its HTML `<base href>` and asset URLs will point to the wrong prefix, causing "Grafana has failed to load its application files" and repeated 404 errors.

- `grafana.ini` must configure `root_url = https://<studio domain>/grafana/` and `serve_from_sub_path = true`.
- The installer automatically configures this after Pigsty installation (`configure_grafana_subpath`) and patches Pigsty's `grafana.ini.j2` template so subsequent infrastructure playbook reruns do not revert to Pigsty's default `/ui/`.
- Management API binary upgrades transactionally repair live configurations, Pigsty templates, and `GRAFANA_URL` on legacy hosts; failed changes restore original files and restart Grafana if it was previously active.

## Default Configuration

Default values in `config.env`:

- `SUPACLOUD_LOGS_ENABLED=true`
- `VICTORIALOGS_DATA_DIR=/var/lib/supacloud/victorialogs`
- `VICTORIALOGS_RETENTION=7d`

`VICTORIALOGS_DATA_DIR` must reside under `/var/lib/supacloud/` and cannot be a symlink. The installer rejects root directories, `..` path traversals, and symlinks. The Management API only reads permitted units and function log files, without mounting or running additional collector containers.

Host installers register a single new logging service: `supacloud-victorialogs.service`. Compose setups connect to the same pinned VictoriaLogs version via internal `http://victorialogs:9428` without publishing port 9428 to the host. Compose does not read non-existent container journald logs; the Management API polls shared project function log directories and persists cursors in persistent volumes. Verify host services with:

```bash
systemctl status supacloud-victorialogs
curl -fsS http://127.0.0.1:9428/health
```

Edge Function runtime logs are written to `.logs/<function>.log` within each project directory and read by the Management API function log endpoint. The built-in collector ingests these files into VictoriaLogs concurrently. Function log access does not depend on VictoriaLogs or Logflare; project service logs and SSE live streams read directly from journald.

## Legacy Hosts

Hosts previously running Logflare should be cleaned using existing migration and cleanup scripts. Fresh installations pass `--skip-analytics` to compatibility scripts to prevent creating, migrating, or recreating Analytics databases or containers. Never point VictoriaLogs data directory to an old Logflare database path.

## Request Correlation and SLO Metrics

The Management API generates or validates the following identifiers on each inbound request and includes them in HTTP response headers:

- `x-request-id`: Unique identifier for the individual request.
- `x-supacloud-trace-id`: Cross-component trace identity; accepts and propagates valid W3C `traceparent` headers.
- `x-supacloud-correlation-id`: Business operation or workflow correlation identity.

The Management API `/metrics` endpoint exports Prometheus exposition text. It is open for local loopback scraping by default; when `SUPACLOUD_METRICS_TOKEN` is set, callers must supply the matching Bearer token. Exported metrics include total requests, 5xx errors, HTTP status code distributions, and request duration latency buckets.

Pigsty / VictoriaMetrics scraping should configure the following baseline SLOs:

| SLI | Recommended Alert Condition |
| --- | --- |
| Management API 5xx ratio | > 1% over a 5-minute rolling window |
| Management API p95 latency | > 500ms over a 5-minute rolling window |
| Edge Function failure rate | > 2% over a 5-minute rolling window |
| Latest pgBackRest successful backup age | > 2x configured backup cycle |
| Patroni / Database replication lag | Exceeds business RPO threshold |
| VictoriaLogs ingestion lag | > 5 minutes |

Alerts must include `x-supacloud-trace-id`, the tenant `project_ref`, and a pointer to the relevant operational runbook. A dashboard without defined thresholds and an incident runbook does not satisfy the operational SLO loop.
