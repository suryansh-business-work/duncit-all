/// <reference types="cypress" />
import { rest, textOf } from '../../../support/api-other';

/**
 * Health / log ingest / SSE — the API's always-on public routes
 * (server/src/index.ts). Scenario map: Other › Health / log ingest / SSE.
 *
 *   GET  /        the branded landing (observability/landing.ts), not "Cannot GET /"
 *   GET  /health  buildHealth() (observability/health.ts): always 200 while up
 *   POST /logs    ingestRemoteLog: always 204; a body that is not a log record
 *                 (no app/page/component) is dropped, never stored
 *
 * The stream's 25-second ping and the stored log row's identity are not
 * observable from here (see the run report), so they are not asserted.
 */

interface HealthReport {
  status: string;
  service: string;
  version: string;
  environment: string;
  node: string;
  platform: string;
  hostname: string;
  timestamp: string;
  uptime: { processSeconds: number; systemSeconds: number };
  memory: Record<string, number>;
  checks: { database: string; redis: string };
}

const TEXT_KEYS: ReadonlyArray<keyof HealthReport> = ['version', 'environment', 'node', 'platform', 'hostname'];
const MEMORY_KEYS =['rssBytes', 'heapUsedBytes', 'heapTotalBytes', 'systemTotalBytes', 'systemFreeBytes'];

describe('API · Health report, landing page and log ingest', { testIsolation: false }, () => {
  it('HL-01 GET /health answers 200 with the documented report', () => {
    rest<HealthReport>('GET', '/health').then((res) => {
      expect(res.status).to.equal(200);
      const health = res.body;
      expect(health.service).to.equal('duncit-server');
      // `degraded` only when the database is not connected — and then it says so.
      expect(health.status).to.be.oneOf(['ok', 'degraded']);
      expect(health.status === 'ok').to.equal(health.checks.database === 'connected');
      expect(health.checks.redis).to.be.a('string').and.not.be.empty;
      TEXT_KEYS.forEach((key) => {
        expect(health[key], key).to.be.a('string').and.not.be.empty;
      });
      expect(Number.isNaN(Date.parse(health.timestamp)), 'timestamp is a date').to.equal(false);
      expect(health.uptime.processSeconds).to.be.a('number').and.be.at.least(0);
      expect(health.uptime.systemSeconds).to.be.a('number').and.be.at.least(health.uptime.processSeconds);
      expect(health.memory).to.have.all.keys(...MEMORY_KEYS);
    });
  });

  it('HL-02 the report exposes no host detail beyond the documented keys', () => {
    rest<HealthReport>('GET', '/health').then((res) => {
      // Disk, IPs and Docker live behind the Tech portal, never on this public route.
      expect(res.body).to.have.all.keys(
        'status',
        'service',
        'version',
        'environment',
        'node',
        'platform',
        'hostname',
        'timestamp',
        'uptime',
        'memory',
        'checks',
      );
    });
  });

  it('HL-03 GET / renders the branded landing instead of "Cannot GET /"', () => {
    rest('GET', '/').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('text/html');
      const html = textOf(res.body);
      expect(html).to.include('<title>Duncit API</title>');
      expect(html).not.to.include('Cannot GET');
    });
  });

  it('HL-04 every response is pinned to its type and does not advertise Express', () => {
    rest('GET', '/health').then((res) => {
      expect(res.headers['x-content-type-options']).to.equal('nosniff');
      expect(res.headers['strict-transport-security']).to.include('max-age=31536000');
      expect(res.headers['x-powered-by']).to.be.undefined;
    });
  });

  it('HL-05 POST /logs answers 204 with an empty body, even for a body that is not a log record', () => {
    rest('POST', '/logs', { body: { note: 'not a log record' } }).then((res) => {
      expect(res.status).to.equal(204);
      expect(res.body).to.be.oneOf(['', undefined, null]);
    });
  });
});
