jest.mock('@modules/crm/marketing/social/social.llm', () => {
  const actual = jest.requireActual('@modules/crm/marketing/social/social.llm');
  return { ...actual, askForJson: jest.fn() };
});

import { askForJson } from '@modules/crm/marketing/social/social.llm';
import type { QualityItem } from '@modules/crm/leadQuality/leadQuality.rules';
import { fallbackQueries, planQueries, provenQuote, readEvidence } from '../../leadResearch.ai';

/**
 * The AI plans searches and points at evidence; the server keeps a "met"
 * verdict only when the quote is in the named source word for word.
 */

const ask = askForJson as jest.Mock;

const request = { lead_type: 'VENUE_LEAD', city: 'Lucknow', locality: 'Gomti Nagar', category: 'cafe', keywords: 'open mic, workshops' };

const item = (key: string, auto_check: QualityItem['auto_check'] = 'NONE'): QualityItem => ({
  key,
  criterion_key: key.split('.')[0],
  sub_key: key.split('.')[1] ?? null,
  name: `Item ${key}`,
  points: 500,
  mandatory: false,
  auto_check,
  threshold: null,
  guidance: '',
});

const lead = {
  name: 'The Barn',
  city: 'Lucknow',
  sources: [
    { kind: 'INSTAGRAM' as const, url: 'https://www.instagram.com/thebarn/', title: 'The Barn', text: 'Cafe & community space.\nOpen mic every Friday night.' },
    { kind: 'GOOGLE_MAPS' as const, url: 'https://www.google.com/maps?cid=1', title: 'The Barn Cafe', text: 'Rated 4.5 from 120 reviews' },
  ],
};

describe('fallbackQueries', () => {
  it('builds searches from the typed category and keywords with the place', () => {
    expect(fallbackQueries(request)).toEqual(['cafe Gomti Nagar Lucknow', 'open mic Gomti Nagar Lucknow', 'workshops Gomti Nagar Lucknow']);
  });

  it('falls back to the lead type when nothing else was typed', () => {
    expect(fallbackQueries({ ...request, category: '', keywords: '', locality: '' })).toEqual(['venue Lucknow']);
  });
});

describe('planQueries', () => {
  it('uses the AI searches, stripped of site: operators and quotes', async () => {
    ask.mockResolvedValue({ queries: ['"cafe events" Gomti Nagar', 'site:instagram.com open mic Lucknow', ''] });
    await expect(planQueries(request, 'test')).resolves.toEqual({ queries: ['cafe events Gomti Nagar', 'open mic Lucknow'], planned_by: 'AI', note: '' });
  });

  it('searches the typed words, and says so, when the AI is unavailable or empty', async () => {
    ask.mockRejectedValue(new Error('AI switched off'));
    const off = await planQueries(request, 'test');
    expect(off).toMatchObject({ planned_by: 'FALLBACK', queries: fallbackQueries(request) });
    expect(off.note).toContain('AI switched off');
    ask.mockResolvedValue({ queries: [] });
    expect((await planQueries(request, 'test')).planned_by).toBe('FALLBACK');
  });
});

describe('provenQuote', () => {
  it('accepts a quote found in the source whatever its line breaks and case', () => {
    expect(provenQuote('open mic EVERY friday', lead.sources[0])).toBe('open mic EVERY friday');
    expect(provenQuote('community space. Open mic', lead.sources[0])).toBe('community space. Open mic');
  });

  it('rejects a quote that is invented, too short or has no source', () => {
    expect(provenQuote('Hosts weddings every weekend', lead.sources[0])).toBeNull();
    expect(provenQuote('Cafe', lead.sources[0])).toBeNull();
    expect(provenQuote('open mic every friday', undefined)).toBeNull();
  });
});

describe('readEvidence', () => {
  const items = [item('event_evidence.past_events'), item('reviews.google_reviews'), item('dedup', 'CRM_UNIQUENESS')];

  it('keeps only proven quotes on known, person-checkable items', async () => {
    ask.mockResolvedValue({
      leads: [
        {
          lead: 1,
          items: [
            { key: 'event_evidence.past_events', verdict: 'MET', source: 'S1', quote: 'Open mic every Friday night' },
            { key: 'reviews.google_reviews', verdict: 'MET', source: 'S2', quote: 'Rated 4.9 from 900 reviews' },
            { key: 'dedup', verdict: 'MET', source: 'S1', quote: 'Cafe & community space' },
            { key: 'made_up', verdict: 'MET', source: 'S1', quote: 'Cafe & community space' },
            { key: 'event_evidence.past_events', verdict: 'MET', source: 'S1', quote: 'Open mic every Friday night' },
          ],
        },
      ],
    });
    const { decisions, note } = await readEvidence([lead], items, 'test');
    expect(note).toBe('');
    expect(decisions).toEqual([
      [
        {
          item_key: 'event_evidence.past_events',
          status: 'VERIFIED',
          evidence: '"Open mic every Friday night" — The Barn',
          source_url: 'https://www.instagram.com/thebarn/',
        },
      ],
    ]);
    const sent = ask.mock.calls[0][0].variables;
    expect(sent.items).not.toContain('dedup');
    expect(sent.leads).toContain('S2 [GOOGLE_MAPS] https://www.google.com/maps?cid=1');
  });

  it('ignores UNKNOWN verdicts and leads that do not exist', async () => {
    ask.mockResolvedValue({ leads: [{ lead: 1, items: [{ key: 'event_evidence.past_events', verdict: 'UNKNOWN' }] }, { lead: 7, items: [] }] });
    expect((await readEvidence([lead], items, 'test')).decisions).toEqual([[]]);
  });

  it('reports an AI failure and gives every lead no AI evidence', async () => {
    ask.mockRejectedValue(new Error('quota'));
    const { decisions, note } = await readEvidence([lead, lead], items, 'test');
    expect(decisions).toEqual([[], []]);
    expect(note).toContain('quota');
  });

  it('does not call the AI when there is nothing it could check', async () => {
    expect(await readEvidence([lead], [item('dedup', 'CRM_UNIQUENESS')], 'test')).toEqual({ decisions: [[]], note: '' });
    expect(ask).not.toHaveBeenCalled();
  });
});
