/// <reference types="cypress" />
import { rest, serverOrigin } from '../../../support/api-other';

/**
 * The status page's server routes (server/src/observability):
 *
 *   GET /status/probe?url=   statusProbe.ts — https only, hosts under duncit.com
 *                            only (the SSRF guard), else 400/403 before any fetch
 *   GET /status/services     statusRoutes.ts — the catalogue, staging-aware
 *   GET /status/summary      per-service state + the 90-day roll-up
 *   GET /status/history      one service's points (≤ 500) + its daily series
 *   GET /status/incidents    last 90 days, each named by its service
 *
 * Scenario map: Other › Status probes ("Probe endpoint guards", "Status read
 * routes"). The probe sweep and the incident seed run on the scheduler and at
 * boot; they are left to the run report.
 */

interface ProbeAnswer {
  ok: boolean;
  error?: string;
  statusCode?: number | null;
  statusText?: string | null;
  ssl?: { daysRemaining: number | null; authorized: boolean } | null;
}

interface ServicesAnswer {
  environment: string;
  groups: Array<{ title: string; items: Array<{ key: string; name: string; url: string }> }>;
}

const probe = (url: string) => rest<ProbeAnswer>('GET', '/status/probe', { qs: { url } });

describe('API · Status probe guards and status read routes', { testIsolation: false }, () => {
  let services: ServicesAnswer['groups'][number]['items'] = [];

  it('ST-01 a url that does not parse is 400 "Invalid url parameter"', () => {
    probe('not a url').then((res) => {
      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({ ok: false, error: 'Invalid url parameter' });
    });
  });

  it('ST-02 a plain-http url is 400 "Only https urls can be probed"', () => {
    probe('http://duncit.com/').then((res) => {
      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({ ok: false, error: 'Only https urls can be probed' });
    });
  });

  it('ST-03 hosts outside duncit.com are 403 "Host not allowed" — lookalikes and userinfo tricks included', () => {
    ['https://example.com/', 'https://evilduncit.com/', 'https://duncit.com.example.com/', 'https://duncit.com@example.com/'].forEach(
      (url) => {
        probe(url).then((res) => {
          expect(res.status, url).to.equal(403);
          expect(res.body, url).to.deep.equal({ ok: false, error: 'Host not allowed' });
        });
      },
    );
  });

  it('ST-04 a duncit.com host is probed for its real status and certificate', () => {
    probe(`${serverOrigin()}/health`).then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.ok).to.equal(true);
      expect(res.body.statusCode).to.equal(200);
      expect(res.body.statusText).to.be.a('string');
      expect(res.body.ssl?.authorized, 'the API certificate validates').to.equal(true);
      expect(res.body.ssl?.daysRemaining).to.be.a('number').and.be.greaterThan(0);
    });
  });

  it('ST-05 /status/services lists the environment-aware catalogue', () => {
    rest<ServicesAnswer>('GET', '/status/services').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.environment).to.be.oneOf(['staging', 'production']);
      services = res.body.groups.flatMap((group) => group.items);
      expect(services, 'services are listed').to.not.be.empty;
      services.forEach((service) => {
        const host = new URL(service.url).hostname;
        expect(host === 'duncit.com' || host.endsWith('.duncit.com'), service.url).to.equal(true);
        // statusServices.ts toStagingUrl: every staging entry points at its staging twin.
        if (res.body.environment === 'staging') expect(host.startsWith('staging.'), service.url).to.equal(true);
      });
    });
  });

  it('ST-06 /status/summary rolls up exactly the listed services', () => {
    rest<{ overall: { total: number; operational: number; degraded: number; down: number }; services: object }>(
      'GET',
      '/status/summary',
    ).then((res) => {
      expect(res.status).to.equal(200);
      const { overall } = res.body;
      expect(Object.keys(res.body.services)).to.have.members(services.map((service) => service.key));
      expect(overall.total).to.equal(services.length);
      expect(overall.operational + overall.degraded + overall.down).to.equal(overall.total);
    });
  });

  it('ST-07 /status/history answers one service with at most 500 points', () => {
    rest<{ service: string; points: unknown[]; daily: unknown[] }>('GET', '/status/history', {
      qs: { service: services[0].key, hours: '24' },
    }).then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.service).to.equal(services[0].key);
      expect(res.body.points.length).to.be.at.most(500);
      expect(res.body.daily).to.be.an('array').and.not.be.empty;
    });
  });

  it('ST-08 /status/history refuses an unknown service (404) and hours outside 1..2160 (400)', () => {
    rest('GET', '/status/history', { qs: { service: 'e2e-no-such-service' } }).then((res) => {
      expect(res.status).to.equal(404);
      expect(res.body).to.deep.equal({ error: 'Unknown service' });
    });
    ['0', '2161', 'abc'].forEach((hours) => {
      rest('GET', '/status/history', { qs: { service: services[0].key, hours } }).then((res) => {
        expect(res.status, `hours=${hours}`).to.equal(400);
        expect(res.body).to.deep.equal({ error: 'hours must be an integer between 1 and 2160' });
      });
    });
  });

  it('ST-09 /status/incidents names every incident by its service', () => {
    rest<{ incidents: Array<{ service_name: string; started_at: string }> }>('GET', '/status/incidents').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.incidents).to.be.an('array');
      res.body.incidents.forEach((incident) => {
        expect(incident.service_name).to.be.a('string').and.not.be.empty;
        expect(Number.isNaN(Date.parse(incident.started_at))).to.equal(false);
      });
    });
  });
});
