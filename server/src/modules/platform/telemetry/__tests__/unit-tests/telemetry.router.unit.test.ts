import express from 'express';
import request from 'supertest';
import { buildTelemetryFeedRouter } from '../../telemetry.router';
import { telemetryService } from '../../telemetry.service';
import { logs } from '@observability/log';

jest.mock('../../telemetry.service', () => ({
  telemetryService: {
    publicKeyMatches: jest.fn(),
    publicLogsFeed: jest.fn(),
    publicBugsFeed: jest.fn(),
    logFeedLimit: jest.fn(),
    bugFeedLimit: jest.fn(),
  },
}));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const svc = telemetryService as unknown as Record<string, jest.Mock>;
const app = () => {
  const server = express();
  server.use('/telemetry', buildTelemetryFeedRouter());
  return server;
};

beforeEach(() => {
  svc.publicKeyMatches.mockResolvedValue(true);
  svc.publicLogsFeed.mockResolvedValue([{ id: 'l1' }]);
  svc.publicBugsFeed.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
  svc.logFeedLimit.mockReturnValue(500);
  svc.bugFeedLimit.mockReturnValue(100);
});

describe('the key', () => {
  it.each(['/telemetry/logs.json', '/telemetry/bugs.json'])('is required on %s, answering 401 with a hint and no rows', async (path) => {
    svc.publicKeyMatches.mockResolvedValue(false);
    const res = await request(app()).get(`${path}?key=wrong`);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'UNAUTHORIZED', message: expect.stringContaining('Tech → Telemetry') });
    expect(svc.publicKeyMatches).toHaveBeenCalledWith('wrong');
    expect(svc.publicLogsFeed).not.toHaveBeenCalled();
    expect(svc.publicBugsFeed).not.toHaveBeenCalled();
  });

  it('may arrive in the x-telemetry-key header, which wins over the query string', async () => {
    await request(app()).get('/telemetry/logs.json?key=from-query').set('x-telemetry-key', ' from-header ');
    expect(svc.publicKeyMatches).toHaveBeenLastCalledWith('from-header');
  });

  it('falls back to the query string for a blank header, and to nothing when neither is given', async () => {
    await request(app()).get('/telemetry/logs.json?key=from-query').set('x-telemetry-key', '  ');
    expect(svc.publicKeyMatches).toHaveBeenLastCalledWith('from-query');
    await request(app()).get('/telemetry/logs.json');
    expect(svc.publicKeyMatches).toHaveBeenLastCalledWith('');
  });

  it('takes the first of a repeated key', async () => {
    await request(app()).get('/telemetry/logs.json?key=one&key=two');
    expect(svc.publicKeyMatches).toHaveBeenLastCalledWith('one');
  });
});

describe('GET /telemetry/logs.json', () => {
  it('passes the filters through, trimmed, and says whether the page was cut', async () => {
    const res = await request(app()).get('/telemetry/logs.json?key=k&level=error&environment=production&source=server&user_id=u1&session_id=s1&ip=1.2.3.4&since_hours=6&limit=2');
    expect(svc.publicLogsFeed).toHaveBeenCalledWith({
      level: 'error', environment: 'production', source: 'server', user_id: 'u1', session_id: 's1', ip: '1.2.3.4', since_hours: 6, limit: 2,
    });
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.text.endsWith('\n')).toBe(true);
    expect(res.text).toContain('\n  "count": 1');
    expect(res.body).toMatchObject({ level: 'error', count: 1, limit: 500, truncated: false, logs: [{ id: 'l1' }] });
    expect(svc.logFeedLimit).toHaveBeenCalledWith(2);
  });

  it('reports all levels when none was asked for, ignoring blank and non-numeric filters', async () => {
    const res = await request(app()).get('/telemetry/logs.json?key=k&level=%20%20&limit=abc&since_hours=');
    expect(res.body.level).toBe('all');
    expect(svc.publicLogsFeed).toHaveBeenCalledWith(expect.objectContaining({ level: undefined, limit: undefined, since_hours: undefined }));
  });

  it('flags a full page as probably truncated', async () => {
    svc.logFeedLimit.mockReturnValue(1);
    const res = await request(app()).get('/telemetry/logs.json?key=k');
    expect(res.body).toMatchObject({ limit: 1, truncated: true });
  });

  it('takes the first of a repeated filter', async () => {
    await request(app()).get('/telemetry/logs.json?key=k&level=error&level=warn');
    expect(svc.publicLogsFeed).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });
});

describe('GET /telemetry/bugs.json', () => {
  it('passes the filters through and reports the count, limit and truncation', async () => {
    svc.bugFeedLimit.mockReturnValue(2);
    const res = await request(app()).get('/telemetry/bugs.json?key=k&status=OPEN&source=mweb&limit=50');
    expect(svc.publicBugsFeed).toHaveBeenCalledWith({ status: 'OPEN', source: 'mweb', limit: 50 });
    expect(res.body).toMatchObject({ count: 2, limit: 2, truncated: true, bugs: [{ id: 'b1' }, { id: 'b2' }] });
    expect(res.body.generated_at).toEqual(expect.any(String));
  });

  it('is not truncated below its ceiling', async () => {
    const res = await request(app()).get('/telemetry/bugs.json?key=k');
    expect(res.body.truncated).toBe(false);
  });
});

describe('failures', () => {
  it.each(['/telemetry/logs.json', '/telemetry/bugs.json'])('answer 500 and log, rather than letting %s kill the process', async (path) => {
    svc.publicKeyMatches.mockRejectedValue(new Error('mongo down'));
    const res = await request(app()).get(`${path}?key=k`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'INTERNAL', message: 'The feed could not be read. Try again.' });
    expect(logs.server.error).toHaveBeenCalledWith('telemetry', 'publicFeed', { error: expect.any(Error), path: path.replace('/telemetry', '') });
  });

  it('does not answer twice when the headers are already out', async () => {
    svc.publicKeyMatches.mockRejectedValue(new Error('late'));
    const layer = (buildTelemetryFeedRouter() as unknown as { stack: Array<{ route: { stack: Array<{ handle: (...a: unknown[]) => void }> } }> }).stack[0];
    const res = { headersSent: true, status: jest.fn() };
    layer.route.stack[0].handle({ headers: { 'x-telemetry-key': ['listed', 'ignored'] }, query: {}, path: '/logs.json' }, res);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(svc.publicKeyMatches).toHaveBeenLastCalledWith('listed');
    expect(logs.server.error).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
