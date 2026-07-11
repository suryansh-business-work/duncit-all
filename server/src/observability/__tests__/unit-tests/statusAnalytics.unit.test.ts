import {
  buildDailySeries,
  buildGlobalSeries,
  liveServiceState,
  windowStats,
  worseState,
  type IncidentWindow,
  type ProbeDay,
} from '../../statusAnalytics';

// Fixed reference time (UTC midday) so day boundaries are deterministic.
const NOW = new Date('2026-07-11T12:00:00.000Z');
const dayStr = (offset: number) =>
  new Date(Date.UTC(2026, 6, 11) - offset * 86_400_000).toISOString().slice(0, 10);

describe('worseState', () => {
  it('picks the more severe state', () => {
    expect(worseState('operational', 'degraded')).toBe('degraded');
    expect(worseState('major_outage', 'partial_outage')).toBe('major_outage');
    expect(worseState('operational', 'operational')).toBe('operational');
  });
});

describe('buildDailySeries', () => {
  it('defaults every day to 100% operational with no data', () => {
    const series = buildDailySeries({
      serviceKey: 'admin',
      probeDaily: new Map(),
      incidents: [],
      days: 90,
      now: NOW,
    });
    expect(series).toHaveLength(90);
    expect(series.at(-1)).toEqual({ date: dayStr(0), uptime: 100, state: 'operational', incidents: 0 });
    expect(series.every((d) => d.uptime === 100 && d.state === 'operational')).toBe(true);
  });

  it('a full-day major outage drops that day to 0%', () => {
    const incidents: IncidentWindow[] = [
      {
        service_key: 'server',
        impact: 'major_outage',
        started_at: new Date(Date.UTC(2026, 6, 9, 0, 0, 0)),
        resolved_at: new Date(Date.UTC(2026, 6, 10, 0, 0, 0)),
      },
    ];
    const series = buildDailySeries({
      serviceKey: 'server',
      probeDaily: new Map(),
      incidents,
      days: 90,
      now: NOW,
    });
    const outage = series.find((d) => d.date === dayStr(2));
    expect(outage).toEqual({ date: dayStr(2), uptime: 0, state: 'major_outage', incidents: 1 });
  });

  it('a degraded incident only partially reduces uptime', () => {
    const incidents: IncidentWindow[] = [
      {
        service_key: 'ai',
        impact: 'degraded',
        started_at: new Date(Date.UTC(2026, 6, 8, 0, 0, 0)),
        resolved_at: new Date(Date.UTC(2026, 6, 9, 0, 0, 0)),
      },
    ];
    const series = buildDailySeries({
      serviceKey: 'ai',
      probeDaily: new Map(),
      incidents,
      days: 90,
      now: NOW,
    });
    const day = series.find((d) => d.date === dayStr(3));
    // degraded weight 0.3 over a full day → 70% uptime.
    expect(day).toEqual({ date: dayStr(3), uptime: 70, state: 'degraded', incidents: 1 });
  });

  it('ignores incidents for other services', () => {
    const incidents: IncidentWindow[] = [
      {
        service_key: 'crm',
        impact: 'major_outage',
        started_at: new Date(Date.UTC(2026, 6, 10, 0, 0, 0)),
        resolved_at: new Date(Date.UTC(2026, 6, 11, 0, 0, 0)),
      },
    ];
    const series = buildDailySeries({
      serviceKey: 'admin',
      probeDaily: new Map(),
      incidents,
      days: 90,
      now: NOW,
    });
    expect(series.every((d) => d.uptime === 100)).toBe(true);
  });

  it('blends real probe failures (worst wins)', () => {
    const probeDaily = new Map<string, ProbeDay>([[dayStr(0), { ok: 18, total: 24 }]]);
    const series = buildDailySeries({
      serviceKey: 'mweb',
      probeDaily,
      incidents: [],
      days: 90,
      now: NOW,
    });
    // 18/24 = 75% → below 90 → major_outage.
    expect(series.at(-1)).toEqual({ date: dayStr(0), uptime: 75, state: 'major_outage', incidents: 0 });
  });
});

describe('windowStats', () => {
  const series = buildDailySeries({
    serviceKey: 'x',
    probeDaily: new Map([[dayStr(0), { ok: 23, total: 24 }]]),
    incidents: [],
    days: 90,
    now: NOW,
  });

  it('24h window is just the latest day', () => {
    expect(windowStats(series, 1).uptime).toBe(95.83);
    expect(windowStats(series, 1).state).toBe('degraded');
  });

  it('90-day window averages the series', () => {
    // 89 days at 100 + 1 day at 95.83 → ~99.95.
    const stats = windowStats(series, 90);
    expect(stats.uptime).toBeGreaterThan(99.9);
    expect(stats.uptime).toBeLessThan(100);
  });
});

describe('liveServiceState', () => {
  const openIncident: IncidentWindow = {
    service_key: 'server',
    impact: 'partial_outage',
    started_at: NOW,
    resolved_at: null,
  };

  it('an open incident wins over probe state', () => {
    expect(
      liveServiceState({ serviceKey: 'server', incidents: [openIncident], latestOk: true })
    ).toEqual({ state: 'partial_outage', activeIncidents: 1 });
  });

  it('reports down when the latest probe failed and no incident', () => {
    expect(liveServiceState({ serviceKey: 'server', incidents: [], latestOk: false })).toEqual({
      state: 'down',
      activeIncidents: 0,
    });
  });

  it('operational when probe ok / unknown', () => {
    expect(liveServiceState({ serviceKey: 'x', incidents: [], latestOk: true }).state).toBe('operational');
    expect(liveServiceState({ serviceKey: 'x', incidents: [], latestOk: null }).state).toBe('operational');
  });
});

describe('buildGlobalSeries', () => {
  it('averages uptime and counts operational services per day', () => {
    const a = buildDailySeries({ serviceKey: 'a', probeDaily: new Map(), incidents: [], days: 3, now: NOW });
    const b = buildDailySeries({
      serviceKey: 'b',
      probeDaily: new Map([[dayStr(0), { ok: 0, total: 10 }]]),
      incidents: [],
      days: 3,
      now: NOW,
    });
    const global = buildGlobalSeries([a, b], 3);
    expect(global).toHaveLength(3);
    const latest = global.at(-1);
    expect(latest?.total).toBe(2);
    expect(latest?.operational).toBe(1); // only `a`
    expect(latest?.uptime).toBe(50); // (100 + 0) / 2
    expect(latest?.state).toBe('major_outage');
  });
});
