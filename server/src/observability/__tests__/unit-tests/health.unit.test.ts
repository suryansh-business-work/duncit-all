import mongoose from 'mongoose';
import { buildHealth } from '../../health';

const setReadyState = (value: number) =>
  Object.defineProperty(mongoose.connection, 'readyState', { value, configurable: true });

describe('buildHealth', () => {
  it('reports ok with full operational detail when the database is connected', () => {
    setReadyState(1);
    const h = buildHealth();
    expect(h.status).toBe('ok');
    expect(h.checks.database).toBe('connected');
    expect(h.service).toBe('duncit-server');
    expect(h.node).toBe(process.version);
    expect(h.uptime.processSeconds).toBeGreaterThanOrEqual(0);
    expect(h.uptime.systemSeconds).toBeGreaterThanOrEqual(0);
    expect(h.memory.rssBytes).toBeGreaterThan(0);
    expect(h.memory.systemTotalBytes).toBeGreaterThan(0);
    expect(typeof h.version).toBe('string');
    expect(new Date(h.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('reports degraded when the database is disconnected', () => {
    setReadyState(0);
    const h = buildHealth();
    expect(h.status).toBe('degraded');
    expect(h.checks.database).toBe('disconnected');
  });

  it('maps an unknown readyState defensively', () => {
    setReadyState(99);
    expect(buildHealth().checks.database).toBe('unknown');
  });
});
