import { describe, expect, it, vi } from 'vitest';
import LeaderboardTable from '../../../src/pages/entity-analytics/LeaderboardTable';
import { byTestId, mount, typeInto, waitUntil } from '../../dom';
import { COPY, leaderboard } from '../../mocks/analytics';

vi.mock('@duncit/table', () => import('../../mocks/table'));

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-testid="table-row"]')];
const cell = (row: HTMLElement, field: string) => byTestId(`cell-${field}`, row).textContent;

describe('LeaderboardTable', () => {
  it('ranks the rows as the server ordered them, with the ranking’s own column names', async () => {
    await mount(<LeaderboardTable leaderboard={leaderboard()} />);
    await waitUntil(() => expect(rows()).toHaveLength(2));

    expect(byTestId('duncit-table').dataset.tableId).toBe('analytics-top_clubs');
    expect(byTestId('header-rank').textContent).toBe('#');
    expect(byTestId('header-name').textContent).toBe(COPY['analytics.leaderboard.club']);
    expect(byTestId('header-values.0').textContent).toBe(COPY['analytics.leaderboard.podsHeld']);
    expect(byTestId('header-values.1').textContent).toBe(COPY['analytics.leaderboard.revenue']);
    expect(byTestId('header-values.2').textContent).toBe(COPY['analytics.leaderboard.avgRating']);

    const [first, second] = rows();
    expect(cell(first, 'rank')).toBe('1');
    expect(cell(second, 'rank')).toBe('2');
  });

  it('writes each value in its column’s format, and a missing one as a dash', async () => {
    await mount(<LeaderboardTable leaderboard={leaderboard()} />);
    await waitUntil(() => expect(rows()).toHaveLength(2));

    const [runners, books] = rows();
    expect(cell(runners, 'values.0')).toBe('14');
    expect(cell(runners, 'values.1')).toBe('₹2.5L');
    expect(cell(runners, 'values.2')).toBe('—');
    expect(cell(books, 'values.2')).toBe('4.6');
  });

  it('shows a caption under the name only when the row has one', async () => {
    await mount(<LeaderboardTable leaderboard={leaderboard()} />);
    await waitUntil(() => expect(rows()).toHaveLength(2));

    const [runners, books] = rows();
    expect(byTestId('cell-name', runners).querySelector('[title="Koramangala Runners"]')?.nextElementSibling?.textContent).toBe(
      'Bengaluru',
    );
    expect(byTestId('cell-name', books).querySelector('[title="HSR Book Circle"]')?.nextElementSibling).toBeNull();
  });

  it('searches names and captions', async () => {
    await mount(<LeaderboardTable leaderboard={leaderboard()} />);
    await waitUntil(() => expect(rows()).toHaveLength(2));
    const search = byTestId('table-search') as HTMLInputElement;
    expect(search.getAttribute('aria-label')).toBe(COPY['analytics.leaderboard.search']);

    await typeInto(search, 'bengaluru');
    await waitUntil(() => expect(rows().map((row) => cell(row, 'name'))).toEqual(['Koramangala RunnersKoramangala RunnersBengaluru']));

    await typeInto(search, 'circle');
    await waitUntil(() => expect(rows()).toHaveLength(1));
    expect(cell(rows()[0], 'rank')).toBe('2');
  });

  it('names its columns by their raw keys when the console has no words for the ranking', async () => {
    await mount(
      <LeaderboardTable
        leaderboard={leaderboard({ key: 'brand_new_ranking', columns: [{ key: 'brand_new_measure', format: 'COUNT' }], rows: [] })}
      />,
    );
    expect(byTestId('header-name').textContent).toBe('');
    expect(byTestId('header-values.0').textContent).toBe('brand_new_measure');
    await waitUntil(() => expect(byTestId('table-empty').textContent).toBe(COPY['analytics.leaderboard.empty']));
  });
});
