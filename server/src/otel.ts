/**
 * OpenTelemetry logs bootstrap → SignOz.
 *
 * Ships the server's `console.*` output (errors first) to the self-hosted SignOz
 * collector as OTLP logs. Imported once, as early as possible, from index.ts.
 *
 * Design rules:
 *  - **Never crash the API.** Everything is wrapped in try/catch and silently
 *    degrades to plain console if telemetry can't initialise or export.
 *  - **Opt-in.** Only activates when OTEL_EXPORTER_OTLP_ENDPOINT (or
 *    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) is set, so local dev is unaffected.
 *  - **Non-destructive.** The patched console still writes to stdout/stderr, so
 *    Docker logs and any other tooling keep working.
 */
import { logs as logsApi, SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

type ConsoleMethod = 'error' | 'warn' | 'info' | 'log' | 'debug';

const SEVERITY: Record<ConsoleMethod, { num: SeverityNumber; text: string }> = {
  error: { num: SeverityNumber.ERROR, text: 'ERROR' },
  warn: { num: SeverityNumber.WARN, text: 'WARN' },
  info: { num: SeverityNumber.INFO, text: 'INFO' },
  log: { num: SeverityNumber.INFO, text: 'INFO' },
  debug: { num: SeverityNumber.DEBUG, text: 'DEBUG' },
};

function resolveLogsEndpoint(): string {
  const direct = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  if (direct) return direct;
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (base) return `${base.replace(/\/$/, '')}/v1/logs`;
  return '';
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function patchConsole(logger: Logger): void {
  (Object.keys(SEVERITY) as ConsoleMethod[]).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args); // keep stdout/stderr → Docker logs intact
      try {
        logger.emit({
          severityNumber: SEVERITY[method].num,
          severityText: SEVERITY[method].text,
          body: args.map(stringifyArg).join(' '),
        });
      } catch {
        /* telemetry must never break logging */
      }
    };
  });
}

function initOtelLogs(): void {
  const endpoint = resolveLogsEndpoint();
  if (!endpoint) return; // opt-in: no endpoint → stay on plain console (local dev)

  try {
    const resource = resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME || 'duncit-server',
      'deployment.environment': process.env.NODE_ENV || 'production',
    });
    const exporter = new OTLPLogExporter({ url: endpoint });
    const provider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(exporter)],
    });
    logsApi.setGlobalLoggerProvider(provider);

    patchConsole(logsApi.getLogger('duncit-server'));

    const shutdown = () => {
      provider.shutdown().catch(() => undefined);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    // Use the ORIGINAL console reference indirectly: this line itself is now
    // forwarded to SignOz too, which is a useful "telemetry is live" marker.
    console.info(`[otel] log export enabled → ${endpoint}`);
  } catch {
    /* swallow: a telemetry failure must never take down the API */
  }
}

initOtelLogs();
