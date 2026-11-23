import { gzipSync } from 'node:zlib';
import { addTo, reviewMetricOf, type MetricRow } from '../../appInsights/appInsights.metrics';
import {
  classifyPlayObject,
  monthDays,
  parsePlayReviews,
  parsePlayStats,
  PLAY_REPORT_KINDS,
  PLAY_REVIEWS_KIND,
} from '../../appInsights/googlePlay.reports';
import {
  APPLE_REPORT_KINDS,
  appleKindOf,
  countAppleReviews,
  dayBounds,
  downloadMetricOf,
  readAppleSegment,
  unzipSegment,
} from '../../appInsights/appStore.reports';

const PKG = 'com.duncit.mobile';
const utf16le = (text: string) => new Uint8Array([0xff, 0xfe, ...Buffer.from(text, 'utf16le')]);
const kind = (id: string) => {
  const found = PLAY_REPORT_KINDS.find((k) => k.id === id);
  if (!found) throw new Error(id);
  return found;
};
const byKey = (rows: MetricRow[]) => Object.fromEntries(rows.map((r) => [`${r.day}|${r.dimension}|${r.key}`, r.metrics]));

describe('metrics helpers', () => {
  it('maps 1-5 stars to their review metric and refuses anything else', () => {
    expect(reviewMetricOf(1)).toBe('reviews_1');
    expect(reviewMetricOf(5)).toBe('reviews_5');
    expect(reviewMetricOf(0)).toBeNull();
    expect(reviewMetricOf(6)).toBeNull();
    expect(reviewMetricOf(4.5)).toBeNull();
  });

  it('adds into one row per day and slice, and ignores a value that is not a number', () => {
    const rows = new Map<string, MetricRow>();
    const at = { day: '2026-05-01', dimension: 'TOTAL' as const, key: '' };
    addTo(rows, at, 'sessions', 2);
    addTo(rows, at, 'sessions', 3);
    addTo(rows, at, 'sessions', Number.NaN);
    expect([...rows.values()]).toEqual([{ ...at, metrics: { sessions: 5 } }]);
  });
});

describe('Google Play report files', () => {
  it('knows each statistics file and the reviews file by name and month', () => {
    expect(classifyPlayObject(`stats/installs/installs_${PKG}_202605_overview.csv`, PKG)).toEqual({
      kind: kind('installs_overview'),
      month: '202605',
    });
    expect(classifyPlayObject(`stats/crashes/crashes_${PKG}_202604_app_version.csv`, PKG)?.kind).toBe(
      kind('crashes_app_version')
    );
    expect(classifyPlayObject(`reviews/reviews_${PKG}_202605.csv`, PKG)).toEqual({ kind: PLAY_REVIEWS_KIND, month: '202605' });
  });

  it('ignores another app, a dimension it does not read, and anything that is not a monthly CSV', () => {
    expect(classifyPlayObject('stats/installs/installs_com.other.app_202605_overview.csv', PKG)).toBeNull();
    expect(classifyPlayObject(`stats/installs/installs_${PKG}_202605_carrier.csv`, PKG)).toBeNull();
    expect(classifyPlayObject(`stats/installs/installs_${PKG}_overview.csv`, PKG)).toBeNull();
    expect(classifyPlayObject(`earnings/earnings_202605_123.zip`, PKG)).toBeNull();
  });

  it('gives a month file its first and last possible day', () => {
    expect(monthDays('202602')).toEqual({ from: '2026-02-01', to: '2026-02-31' });
  });

  it('reads the installs overview into whole-app days, by heading, levels kept as they are', () => {
    const csv = [
      'Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs,Install events,Update events,Uninstall events',
      `2026-05-01,${PKG},12,3,40,9000,10,2,4100,15,44,4`,
      `2026-05-02,${PKG},8,1,,9008,7,0,4110,9,,1`,
      'not a date,x,1,1,1,1,1,1,1,1,1,1',
    ].join('\n');
    const rows = byKey(parsePlayStats(utf16le(csv), kind('installs_overview')));
    expect(rows['2026-05-01|TOTAL|']).toEqual({
      new_installs: 10,
      device_installs: 12,
      uninstalls: 3,
      user_uninstalls: 2,
      updates: 40,
      active_devices: 4100,
      total_installs: 9000,
      install_events: 15,
      uninstall_events: 4,
      update_events: 44,
    });
    // A blank cell is not a zero: the metric is simply absent.
    expect(rows['2026-05-02|TOTAL|']).not.toHaveProperty('updates');
    expect(Object.keys(rows)).toHaveLength(2);
  });

  it('accepts the older "Current Device Installs" heading for active devices', () => {
    const rows = parsePlayStats(utf16le(`Date,Current Device Installs\n2026-01-03,500`), kind('installs_overview'));
    expect(rows[0]?.metrics).toEqual({ active_devices: 500 });
  });

  it('reads the country file per country code and skips a row with no country', () => {
    const csv = `Date,Package Name,Country,Daily User Installs\n2026-05-01,${PKG},in,6\n2026-05-01,${PKG},US,2\n2026-05-01,${PKG},,9`;
    const rows = byKey(parsePlayStats(utf16le(csv), kind('installs_country')));
    expect(rows).toEqual({
      '2026-05-01|COUNTRY|IN': { new_installs: 6 },
      '2026-05-01|COUNTRY|US': { new_installs: 2 },
    });
  });

  it('reads crashes per version code and ratings for the whole app', () => {
    const crashes = parsePlayStats(
      utf16le(`Date,Package Name,App Version Code,Daily Crashes,Daily ANRs\n2026-05-01,${PKG},181,4,1`),
      kind('crashes_app_version')
    );
    expect(crashes).toEqual([{ day: '2026-05-01', dimension: 'VERSION', key: '181', metrics: { crashes: 4, anrs: 1 } }]);
    const ratings = parsePlayStats(
      utf16le(`Date,Package Name,Daily Average Rating,Total Average Rating\n2026-05-01,${PKG},NA,4.31`),
      kind('ratings_overview')
    );
    expect(ratings[0]?.metrics).toEqual({ rating_total_avg: 4.31 });
  });

  it('counts reviews into their submit day by star, skipping rows without a day or a valid star', () => {
    const csv = [
      'Package Name,Review Submit Date and Time,Star Rating,Review Text',
      `${PKG},2026-05-01T10:00:00Z,5,"Love it, really"`,
      `${PKG},2026-05-01T11:00:00Z,5,`,
      `${PKG},2026-05-02T09:00:00Z,1,"crashes\non start"`,
      `${PKG},,4,no date`,
      `${PKG},2026-05-03T09:00:00Z,0,bad star`,
    ].join('\n');
    expect(byKey(parsePlayReviews(utf16le(csv)))).toEqual({
      '2026-05-01|TOTAL|': { reviews_5: 2 },
      '2026-05-02|TOTAL|': { reviews_1: 1 },
    });
  });
});

describe('App Store analytics reports', () => {
  const downloads = APPLE_REPORT_KINDS[0];
  const crashes = APPLE_REPORT_KINDS[3];

  it('classifies download types and leaves restores and pre-orders out', () => {
    expect(downloadMetricOf('First-time download')).toBe('first_downloads');
    expect(downloadMetricOf('Redownload')).toBe('redownloads');
    expect(downloadMetricOf('Auto-update')).toBe('updates');
    expect(downloadMetricOf('Manual update')).toBe('updates');
    expect(downloadMetricOf('Restore')).toBeNull();
  });

  it('finds a report kind by Apple name loosely, and null for one it does not read', () => {
    expect(appleKindOf('app sessions standard')?.name).toBe('App Sessions Standard');
    expect(appleKindOf('App Store Discovery and Engagement Standard')).toBeNull();
  });

  it('unzips a gzip segment and passes plain bytes through', () => {
    const plain = Buffer.from('Date\tCounts');
    expect(Buffer.from(unzipSegment(new Uint8Array(gzipSync(plain)))).toString()).toBe('Date\tCounts');
    expect(unzipSegment(new Uint8Array(plain))).toEqual(new Uint8Array(plain));
  });

  it('adds a downloads segment up into the whole app, per territory and per version', () => {
    const tsv = [
      'Date\tApp Name\tDownload Type\tApp Version\tTerritory\tCounts',
      '2026-05-01\tDuncit\tFirst-time download\t1.80\tIN\t5',
      '2026-05-01\tDuncit\tFirst-time download\t1.81\tUS\t2',
      '2026-05-01\tDuncit\tRedownload\t1.81\tIN\t1',
      '2026-05-01\tDuncit\tRestore\t1.81\tIN\t9',
    ].join('\n');
    const rows = new Map<string, MetricRow>();
    if (!downloads) throw new Error('kind');
    readAppleSegment(new Uint8Array(gzipSync(Buffer.from(tsv))), downloads, rows);
    expect(byKey([...rows.values()])).toEqual({
      '2026-05-01|TOTAL|': { first_downloads: 7, redownloads: 1 },
      '2026-05-01|COUNTRY|IN': { first_downloads: 5, redownloads: 1 },
      '2026-05-01|COUNTRY|US': { first_downloads: 2 },
      '2026-05-01|VERSION|1.80': { first_downloads: 5 },
      '2026-05-01|VERSION|1.81': { first_downloads: 2, redownloads: 1 },
    });
  });

  it('splits crashes by version only — the crash report has no territory', () => {
    const rows = new Map<string, MetricRow>();
    if (!crashes) throw new Error('kind');
    readAppleSegment(Buffer.from('Date\tApp Version\tCrashes\n2026-05-02\t1.81\t3'), crashes, rows);
    expect([...rows.values()].map((r) => r.dimension).sort()).toEqual(['TOTAL', 'VERSION']);
  });

  it('reads installs and deletions from the Event column', () => {
    const kindInstall = appleKindOf('App Store Installation and Deletion Standard');
    if (!kindInstall) throw new Error('kind');
    const rows = new Map<string, MetricRow>();
    readAppleSegment(
      Buffer.from('Date\tEvent\tCounts\tTerritory\n2026-05-01\tInstall\t4\tIN\n2026-05-01\tDelete\t1\tIN\n2026-05-01\tOther\t7\tIN'),
      kindInstall,
      rows
    );
    expect(byKey([...rows.values()])['2026-05-01|TOTAL|']).toEqual({ installs: 4, deletions: 1 });
  });

  it('bounds the days a set of rows covers, or null for none', () => {
    const rows: MetricRow[] = [
      { day: '2026-05-03', dimension: 'TOTAL', key: '', metrics: {} },
      { day: '2026-05-01', dimension: 'TOTAL', key: '', metrics: {} },
    ];
    expect(dayBounds(rows)).toEqual({ from: '2026-05-01', to: '2026-05-03' });
    expect(dayBounds([])).toBeNull();
  });

  it('counts customer reviews per day by star', () => {
    expect(
      countAppleReviews([
        { rating: 4, createdDate: '2026-05-01T08:00:00-07:00' },
        { rating: 4, createdDate: '2026-05-01T20:00:00-07:00' },
        { rating: 2, createdDate: '2026-05-02T01:00:00-07:00' },
        { rating: 9, createdDate: '2026-05-02T01:00:00-07:00' },
      ])
    ).toEqual([
      { day: '2026-05-01', dimension: 'TOTAL', key: '', metrics: { reviews_4: 2 } },
      { day: '2026-05-02', dimension: 'TOTAL', key: '', metrics: { reviews_2: 1 } },
    ]);
  });
});
