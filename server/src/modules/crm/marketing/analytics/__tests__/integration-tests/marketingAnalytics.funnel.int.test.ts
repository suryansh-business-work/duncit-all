import { marketingAnalyticsService } from '../../marketingAnalytics.service';
import { MarketingLeadModel } from '../../../leads/marketingLead.model';

const WEEK = { from: '2026-10-01', to: '2026-10-07' };

const at = (iso: string) => new Date(iso);
const stage = (when: string, text: string) => ({ at: at(when), kind: 'STAGE', text, by_name: 'Asha' });

/**
 * Leads written straight to the collection, so their creation time and their
 * timeline are exactly the story each test tells.
 */
const lead = (over: Record<string, unknown>) =>
  MarketingLeadModel.collection.insertOne({
    name: 'Lead',
    pipeline: 'VENUE',
    stage: 'NEW',
    source: 'MANUAL',
    timeline: [],
    promoted: false,
    crm_ref: { kind: null, id: '', promoted_at: null, promoted_by: '' },
    ...over,
  });

/** Three leads created in the week, one older lead moved in it, one created after it. */
async function seedPipeline() {
  await lead({
    source: 'INSTAGRAM',
    stage: 'CONVERTED',
    created_at: at('2026-10-01T00:00:00.000Z'),
    timeline: [
      { at: at('2026-10-01T00:00:00.000Z'), kind: 'CREATED', text: 'Added from INSTAGRAM', by_name: 'System' },
      stage('2026-10-01T10:00:00.000Z', 'NEW → CONTACTED'),
      stage('2026-10-02T10:00:00.000Z', 'CONTACTED → QUALIFIED: good fit: ready'),
      stage('2026-10-03T10:00:00.000Z', 'QUALIFIED → CONVERTED'),
    ],
    promoted: true,
    crm_ref: { kind: 'VENUE', id: 'v1', promoted_at: at('2026-10-03T11:00:00.000Z'), promoted_by: 'u1' },
  });
  await lead({
    source: 'IMPORT',
    pipeline: 'HOST',
    stage: 'LOST',
    created_at: at('2026-10-02T00:00:00.000Z'),
    timeline: [stage('2026-10-02T02:00:00.000Z', 'NEW → CONTACTED'), stage('2026-10-04T02:00:00.000Z', 'CONTACTED → LOST: no reply')],
  });
  await lead({ created_at: at('2026-10-03T00:00:00.000Z') });
  await lead({
    source: 'INSTAGRAM',
    stage: 'CONTACTED',
    created_at: at('2026-09-01T00:00:00.000Z'),
    timeline: [stage('2026-10-05T00:00:00.000Z', 'NEW → CONTACTED')],
  });
  await lead({ created_at: at('2026-10-20T00:00:00.000Z'), timeline: [stage('2026-10-21T00:00:00.000Z', 'NEW → CONTACTED')] });
}

describe('marketingAnalyticsService.funnel', () => {
  it('reads an empty window as zeros, every stage and source present', async () => {
    const funnel = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel).toMatchObject({ pipeline: null, new_leads: 0, converted: 0, promoted: 0, transitions: [], time_in_stage: [] });
    expect(funnel.by_source.every((row) => row.count === 0)).toBe(true);
    expect(funnel.by_stage.map((row) => row.key)).toEqual(['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED', 'LOST']);
    expect(funnel.funnel).toEqual(
      ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED'].map((key) => ({ stage: key, reached: 0, conversion: 0 }))
    );
    expect(funnel.promoted_by_kind).toEqual([
      { key: 'VENUE', count: 0 },
      { key: 'HOST', count: 0 },
      { key: 'ECOMM', count: 0 },
    ]);
    expect(funnel.daily_new).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('reads the cohort: new leads by source, where they stand now and per day', async () => {
    await seedPipeline();
    const funnel = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel.new_leads).toBe(3);
    const sources = Object.fromEntries(funnel.by_source.map((row) => [row.key, row.count]));
    expect(sources).toEqual({ INSTAGRAM: 1, GOOGLE_PLACES: 0, WEB_SEARCH: 0, IMPORT: 1, MANUAL: 1 });
    const stages = Object.fromEntries(funnel.by_stage.map((row) => [row.key, row.count]));
    expect(stages).toEqual({ NEW: 1, CONTACTED: 0, REPLIED: 0, QUALIFIED: 0, CONVERTED: 1, LOST: 1 });
    expect(funnel.daily_new).toEqual([1, 1, 1, 0, 0, 0, 0]);
  });

  it('builds the funnel from how far each lead ever got, a skipped stage counted as passed', async () => {
    await seedPipeline();
    const { funnel } = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel).toEqual([
      { stage: 'NEW', reached: 3, conversion: 100 },
      // The lost lead had been contacted first.
      { stage: 'CONTACTED', reached: 2, conversion: 66.7 },
      // The converted lead skipped REPLIED; it still went past it.
      { stage: 'REPLIED', reached: 1, conversion: 50 },
      { stage: 'QUALIFIED', reached: 1, conversion: 100 },
      { stage: 'CONVERTED', reached: 1, conversion: 100 },
    ]);
  });

  it('reads the stage changes made in the window, whoever made them, as shares of each stage’s exits', async () => {
    await seedPipeline();
    const funnel = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel.transitions).toEqual([
      { from: 'NEW', to: 'CONTACTED', count: 3, share: 100 },
      { from: 'CONTACTED', to: 'QUALIFIED', count: 1, share: 50 },
      { from: 'CONTACTED', to: 'LOST', count: 1, share: 50 },
      { from: 'QUALIFIED', to: 'CONVERTED', count: 1, share: 100 },
    ]);
    expect(funnel.converted).toBe(1);
  });

  it('takes the median time in each stage from creation or the previous change', async () => {
    await seedPipeline();
    const { time_in_stage } = await marketingAnalyticsService.funnel(WEEK);
    // NEW: 10 h, 2 h and the older lead's 34 days (816 h) — the median is 10.
    expect(time_in_stage).toEqual([
      { stage: 'NEW', moves: 3, median_hours: 10 },
      { stage: 'CONTACTED', moves: 2, median_hours: 36 },
      { stage: 'QUALIFIED', moves: 1, median_hours: 24 },
    ]);
  });

  it('counts the leads promoted to the CRM in the window, by record kind', async () => {
    await seedPipeline();
    const funnel = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel.promoted).toBe(1);
    expect(funnel.promoted_by_kind).toEqual([
      { key: 'VENUE', count: 1 },
      { key: 'HOST', count: 0 },
      { key: 'ECOMM', count: 0 },
    ]);
  });

  it('stops at the window’s last day in the admin zone', async () => {
    await seedPipeline();
    const funnel = await marketingAnalyticsService.funnel({ from: '2026-10-01', to: '2026-10-03' });
    // The LOST move (4 Oct 07:30 IST) and the older lead's move (5 Oct) are after it.
    expect(funnel.transitions.map((row) => `${row.from}>${row.to}`)).toEqual(['NEW>CONTACTED', 'CONTACTED>QUALIFIED', 'QUALIFIED>CONVERTED']);
    expect(funnel.transitions[0]).toMatchObject({ count: 2 });
    expect(funnel.daily_new).toEqual([1, 1, 1]);
  });

  it('reads one pipeline when asked', async () => {
    await seedPipeline();
    const funnel = await marketingAnalyticsService.funnel(WEEK, 'HOST');
    expect(funnel.pipeline).toBe('HOST');
    expect(funnel.new_leads).toBe(1);
    expect(funnel.transitions).toEqual([
      { from: 'NEW', to: 'CONTACTED', count: 1, share: 100 },
      { from: 'CONTACTED', to: 'LOST', count: 1, share: 100 },
    ]);
    expect(funnel.promoted).toBe(0);
  });

  it('keeps a timeline line it cannot read as a change from and to nowhere', async () => {
    await lead({ created_at: at('2026-10-01T00:00:00.000Z'), timeline: [stage('2026-10-01T05:00:00.000Z', 'moved by hand')] });
    const funnel = await marketingAnalyticsService.funnel(WEEK);
    expect(funnel.transitions).toEqual([{ from: 'moved by hand', to: '', count: 1, share: 100 }]);
    // Not a known stage, so it has no time-in-stage row; the lead still stands on the first rung.
    expect(funnel.time_in_stage).toEqual([]);
    expect(funnel.funnel[0]).toEqual({ stage: 'NEW', reached: 1, conversion: 100 });
  });
});
