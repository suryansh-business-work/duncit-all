/**
 * The shared Analytics payload helpers: linking every widget, ranking rows,
 * banding values and turning aggregation rows into maps.
 */
import { consoleLink, type ConsoleLink } from '../../links';
import {
  bandSlices,
  breakdown,
  countMap,
  kpi,
  linkEverything,
  linkWidgets,
  rankedSlices,
  type EntityAnalyticsSections,
} from '../../shapes';

const own = consoleLink('pods', '/pods/own');
const page = consoleLink('pods', '/pods');

const leaderboard = (link: ConsoleLink | null = null) => ({ key: 'top', columns: [], rows: [], link });

const sections = (over: Partial<EntityAnalyticsSections> = {}): EntityAnalyticsSections => ({
  kpis: [kpi('total', 3, 1), kpi('mine', 2, null, { link: own })],
  trends: [],
  breakdowns: [breakdown('by_city', [])],
  leaderboard: null,
  ...over,
});

describe('linkWidgets', () => {
  const linkOf = (key: string): ConsoleLink | null => (key === 'total' || key === 'top' ? page : null);

  it('fills missing links from the key table and keeps a widget own link', () => {
    const linked = linkWidgets(sections({ leaderboard: leaderboard() }), linkOf);
    expect(linked.kpis.map((item) => item.link)).toEqual([page, own]);
    // No table entry for this key: stays without a link rather than inventing one.
    expect(linked.breakdowns[0].link).toBeNull();
    expect(linked.leaderboard?.link).toEqual(page);
  });

  it('keeps an absent leaderboard absent', () => {
    expect(linkWidgets(sections(), linkOf).leaderboard).toBeNull();
  });
});

describe('linkEverything', () => {
  it('points every unlinked widget and the page at the one console page', () => {
    const linked = linkEverything(sections({ leaderboard: leaderboard(own) }), page);
    expect(linked.link).toEqual(page);
    expect(linked.kpis.map((item) => item.link)).toEqual([page, own]);
    expect(linked.breakdowns[0].link).toEqual(page);
    expect(linked.leaderboard?.link).toEqual(own);
  });

  it('keeps the page own link and a missing leaderboard missing', () => {
    const linked = linkEverything(sections({ link: own }), page);
    expect(linked.link).toEqual(own);
    expect(linked.leaderboard).toBeNull();
  });
});

describe('rankedSlices', () => {
  const rows = [
    { name: 'b', n: 2 },
    { name: 'a', n: 2 },
    { name: 'c', n: 9 },
  ];

  it('names each slice by its row, largest first, ties alphabetical', () => {
    expect(
      rankedSlices(
        rows,
        (row) => row.name,
        (row) => row.n
      )
    ).toEqual([
      { key: 'c', label: 'c', value: 9 },
      { key: 'a', label: 'a', value: 2 },
      { key: 'b', label: 'b', value: 2 },
    ]);
  });

  it('caps the list at the limit', () => {
    const top = rankedSlices(
      rows,
      (row) => row.name,
      (row) => row.n,
      1
    );
    expect(top.map((slice) => slice.key)).toEqual(['c']);
  });
});

describe('bandSlices', () => {
  it('drops a value below the first band and keeps empty bands as zero', () => {
    const bands = [
      { key: 'low', min: 1 },
      { key: 'mid', min: 5 },
      { key: 'high', min: 10 },
    ];
    expect(bandSlices([0, 1, 4, 12], bands)).toEqual([
      { key: 'low', label: null, value: 2 },
      { key: 'mid', label: null, value: 0 },
      { key: 'high', label: null, value: 1 },
    ]);
  });
});

describe('countMap', () => {
  it('keys aggregation rows by their stringified id, null included', () => {
    const map = countMap([
      { _id: 'DELHI', count: 4 },
      { _id: 7, count: 2 },
      { _id: null, count: 1 },
    ]);
    expect(Object.fromEntries(map)).toEqual({ DELHI: 4, '7': 2, null: 1 });
  });
});
