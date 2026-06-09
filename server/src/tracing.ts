/**
 * OpenTelemetry tracing → SignOz. Auto-instruments HTTP, Express, GraphQL and
 * MongoDB/Mongoose, so requests and DB queries (with their errors + latency)
 * show up as spans in SignOz Traces.
 *
 * MUST be preloaded before the app so instrumentation can patch modules at
 * require time: the production entrypoint runs `node -r ./dist/tracing.js
 * dist/index.js`.
 *
 * Gated on OTEL_EXPORTER_OTLP_ENDPOINT (off in local dev) and fully defensive —
 * a tracing failure must never take down the API.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (base) {
  try {
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        'service.name': process.env.OTEL_SERVICE_NAME || 'duncit-server',
        'deployment.environment': process.env.NODE_ENV || 'production',
      }),
      traceExporter: new OTLPTraceExporter({ url: `${base.replace(/\/$/, '')}/v1/traces` }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // fs spans are extremely noisy and not useful here.
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });
    sdk.start();
    process.once('SIGTERM', () => {
      sdk.shutdown().catch(() => undefined);
    });
  } catch {
    /* tracing must never crash the API */
  }
}
