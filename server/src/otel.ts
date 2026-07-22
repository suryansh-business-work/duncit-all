/**
 * OpenTelemetry logs bootstrap → SignOz.
 *
 * Sets up the OTLP LoggerProvider that `observability/log.ts` emits through.
 * Imported once, as early as possible, from index.ts.
 *
 * The blind `console.*` monkey-patch was removed: logs are now emitted
 * explicitly at the file level via `logs.server.error(page, component, { error })`
 * (mirrored across UI + backend by @duncit/logs), so every record carries a
 * structured environment / source / url / error attribute set that SignOz can
 * filter on — instead of an unstructured stringified console line.
 *
 * Design rules:
 *  - **Never crash the API.** Everything is wrapped in try/catch and silently
 *    degrades if telemetry can't initialise.
 *  - **Opt-in.** Only activates when OTEL_EXPORTER_OTLP_ENDPOINT (or
 *    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) is set, so local dev is unaffected.
 */
import { logs as logsApi } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

function resolveLogsEndpoint(): string {
  const direct = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  if (direct) return direct;
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (base) return `${base.replace(/\/$/, '')}/v1/logs`;
  return '';
}

function initOtelLogs(): void {
  const endpoint = resolveLogsEndpoint();
  if (!endpoint) return; // opt-in: no endpoint → stay on plain console (local dev)

  try {
    const resource = resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || 'duncit-server',
      'deployment.environment': process.env.APP_ENV ?? process.env.NODE_ENV ?? 'production',
    });
    const exporter = new OTLPLogExporter({ url: endpoint });
    const provider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(exporter)],
    });
    logsApi.setGlobalLoggerProvider(provider);

    const shutdown = () => {
      provider.shutdown().catch(() => undefined);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch {
    /* swallow: a telemetry failure must never take down the API */
  }
}

initOtelLogs();
