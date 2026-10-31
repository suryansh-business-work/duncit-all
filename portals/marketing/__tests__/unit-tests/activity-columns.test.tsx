import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { fetchRowsFrom } from './table-mock';
import { makeRunRow } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));

import { DuncitTable } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  STATUSES,
  STATUS_COLORS,
  STATUS_LABEL,
  isOpenRun,
  isRunStatus,
  isRunWorkflow,
} from '../../src/pages/activity-page/copy';
import { getRunColumns } from '../../src/pages/activity-page/runColumns';
import { AWAITING_APPROVAL_FILTERS, openRunFilters, pinnedFilters } from '../../src/pages/activity-page/runFilters';
import { actorLabel, durationMs, formatDuration } from '../../src/pages/activity-page/runFormat';
import RunStatusChip from '../../src/pages/activity-page/RunStatusChip';
import RunsLegend from '../../src/pages/activity-page/RunsLegend';
import type { MarketingRunRow, MarketingRunStatus } from '../../src/pages/activity-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;
const fmt = (date: Date) => `fmt:${date.toISOString()}`;

describe('durationMs', () => {
  it('measures start to finish in milliseconds', () => {
    expect(durationMs('2026-10-30T10:00:00.000Z', '2026-10-30T10:00:12.000Z')).toBe(12_000);
  });

  it.each([
    ['no start', null, '2026-10-30T10:00:12.000Z'],
    ['no finish', '2026-10-30T10:00:00.000Z', null],
    ['an unreadable date', 'yesterday', '2026-10-30T10:00:12.000Z'],
    ['a finish before the start', '2026-10-30T10:00:12.000Z', '2026-10-30T10:00:00.000Z'],
  ])('has no answer for %s', (_label, start, end) => {
    expect(durationMs(start, end)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [850, '850 ms'],
    [12_000, '12s'],
    [59_600, '1m 0s'],
    [200_000, '3m 20s'],
    [3_900_000, '1h 5m'],
  ])('writes %d ms compactly as %s', (ms, text) => {
    expect(formatDuration(ms, translator().t)).toBe(text);
  });
});

describe('actorLabel', () => {
  it('names the actor, and falls back to what kind of actor it was', () => {
    const { t } = translator();
    expect(actorLabel({ kind: 'USER', id: 'u1', name: 'Asha Rao', email: '' }, t)).toBe('Asha Rao');
    expect(actorLabel({ kind: 'SYSTEM', id: '', name: '', email: '' }, t)).toBe('System');
    expect(actorLabel({ kind: 'AGENT', id: 'reel-bot', name: '', email: '' }, t)).toBe('Agent');
  });
});

describe('run filters', () => {
  it('pins the status, workflow and person a URL asks for', () => {
    expect(pinnedFilters(new URLSearchParams('status=FAILED&workflow=REEL&mine=1'), 'u1')).toEqual([
      { field: 'status', op: 'eq', value: 'FAILED' },
      { field: 'workflow', op: 'eq', value: 'REEL' },
      { field: 'actor_id', op: 'eq', value: 'u1' },
    ]);
  });

  it('ignores a status or workflow that names nothing, and mine unless it is 1', () => {
    expect(pinnedFilters(new URLSearchParams('status=DONE&workflow=EMAIL&mine=0'), 'u1')).toEqual([]);
    expect(pinnedFilters(new URLSearchParams(''), null)).toEqual([]);
  });

  it('cannot pin "mine" before the signed-in person is known', () => {
    expect(pinnedFilters(new URLSearchParams('mine=1'), null)).toBeNull();
    expect(pinnedFilters(new URLSearchParams('status=FAILED&mine=1'), '')).toBeNull();
  });

  it('lists a person’s unfinished runs, and only runs that wait on a decision', () => {
    expect(openRunFilters('u7')).toEqual([
      { field: 'actor_id', op: 'eq', value: 'u7' },
      { field: 'status', op: 'in', values: ['PENDING', 'RUNNING', 'AWAITING_APPROVAL'] },
    ]);
    expect(AWAITING_APPROVAL_FILTERS).toEqual([{ field: 'status', op: 'eq', value: 'AWAITING_APPROVAL' }]);
  });

  it('recognises the enum members and nothing else', () => {
    expect(isRunStatus('PARTIAL')).toBe(true);
    expect(isRunStatus('partial')).toBe(false);
    expect(isRunWorkflow('OUTREACH')).toBe(true);
    expect(isRunWorkflow(null)).toBe(false);
    expect(isOpenRun('RUNNING')).toBe(true);
    expect(isOpenRun('COMPLETED')).toBe(false);
  });
});

/** An enum column's filter options (text and date columns have none). */
const optionsOf = (column: ReturnType<typeof getRunColumns>[number]) => ('options' in column ? column.options : undefined);

describe('getRunColumns', () => {
  const renderColumns = (rows: MarketingRunRow[], onOpen = vi.fn()) => {
    function RunsHarness() {
      const { t } = useTranslation();
      return (
        <DuncitTable
          tableId="marketing-runs"
          columns={getRunColumns(t, fmt, onOpen)}
          fetchRows={fetchRowsFrom(rows)}
          getRowId={(row: MarketingRunRow) => row.id}
        />
      );
    }
    return renderWithProviders(<RunsHarness />);
  };

  it('declares the columns in reading order, filtering only where the server can match', () => {
    const columns = getRunColumns(translator().t, fmt, vi.fn());
    expect(columns.map((column) => column.field)).toEqual([
      'name',
      'workflow',
      'status',
      'actor_kind',
      'trigger',
      'started_at',
      'finished_at',
      'duration',
      'created_at',
      'actions',
    ]);
    // The actions column names itself through the grid's shared copy, so only the nine data headers are this page's.
    expect(columns.slice(0, 9).map((column) => column.headerName)).toEqual([
      'Run',
      'Type',
      'Status',
      'Who',
      'Started by',
      'Started',
      'Finished',
      'Took',
      'Created',
    ]);
    expect(optionsOf(columns[1])).toEqual([
      { value: 'SOCIAL_PUBLISH', label: 'Social post' },
      { value: 'SOCIAL_SYNC', label: 'Social sync' },
      { value: 'SOCIAL_HEALTH', label: 'Account health check' },
      { value: 'REEL', label: 'Reel' },
      { value: 'LEAD_SEARCH', label: 'Lead search' },
      { value: 'OUTREACH', label: 'Outreach' },
      { value: 'AGENT', label: 'AI agent' },
      { value: 'ORCHESTRATOR', label: 'Orchestrator' },
      { value: 'CAMPAIGN', label: 'Campaign' },
      { value: 'OTHER', label: 'Other' },
    ]);
    expect(optionsOf(columns[2])?.map((option) => option.label)).toEqual([
      'Queued',
      'Running',
      'Needs approval',
      'Done',
      'Partly done',
      'Failed',
      'Cancelled',
    ]);
    expect(optionsOf(columns[3])).toEqual([
      { value: 'USER', label: 'Person' },
      { value: 'AGENT', label: 'Agent' },
      { value: 'SYSTEM', label: 'System' },
    ]);
    expect(optionsOf(columns[4])?.map((option) => option.value)).toEqual(['USER', 'SCHEDULE', 'WEBHOOK', 'AGENT', 'SYSTEM']);
    // Only what the server orders by sorts; the two visible times read through the admin's date-time format.
    expect(columns.filter((column) => column.sortable === false).map((column) => column.field)).toEqual([
      'name',
      'actor_kind',
      'trigger',
      'started_at',
      'duration',
    ]);
    expect(columns[5]).toMatchObject({ hide: false, filterable: false, formatDate: fmt });
    expect(columns[6]).toMatchObject({ hide: false, filterable: false, formatDate: fmt });
    expect(columns[8]).toMatchObject({ formatDate: fmt });
  });

  it('shows a run’s name, type, status chip, actor, trigger and how long it took, and opens it', async () => {
    const row = makeRunRow();
    const onOpen = vi.fn();
    renderColumns([row], onOpen);
    const tableRow = await screen.findByTestId('table-row');
    expect(within(tableRow).getByTestId('cell-name')).toHaveTextContent('Publish: Diwali reel');
    expect(within(tableRow).getByTestId('cell-workflow')).toHaveTextContent('Social post');
    const status = within(tableRow).getByTestId('cell-status');
    expect(within(status).getAllByText('Done')).toHaveLength(2);
    expect(status.querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(tableRow).getByTestId('cell-actor_kind')).toHaveTextContent('Asha Rao');
    expect(within(tableRow).getByTestId('cell-trigger')).toHaveTextContent('A person');
    expect(within(tableRow).getByTestId('cell-duration')).toHaveTextContent('12s');
    fireEvent.click(within(tableRow).getByRole('button', { name: 'Open run' }));
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  it('names an unnamed agent by its kind and shows a dash for a run still going', async () => {
    renderColumns([
      makeRunRow({
        id: 'run2',
        status: 'RUNNING',
        trigger: 'SCHEDULE',
        actor: { kind: 'AGENT', id: 'reel-bot', name: '', email: '' },
        finished_at: null,
      }),
    ]);
    const tableRow = await screen.findByTestId('table-row');
    expect(within(tableRow).getByTestId('cell-actor_kind')).toHaveTextContent('Agent');
    expect(within(tableRow).getByTestId('cell-trigger')).toHaveTextContent('Schedule');
    expect(within(tableRow).getByTestId('cell-duration')).toHaveTextContent(/^—$/);
    expect(within(tableRow).getByTestId('cell-status').querySelector('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
  });
});

describe('RunStatusChip', () => {
  const colorClass: Record<string, string> = {
    default: 'MuiChip-colorDefault',
    primary: 'MuiChip-colorPrimary',
    info: 'MuiChip-colorInfo',
    success: 'MuiChip-colorSuccess',
    warning: 'MuiChip-colorWarning',
    error: 'MuiChip-colorError',
  };

  it.each(STATUSES)('colours %s the same everywhere', (status: MarketingRunStatus) => {
    const { t } = translator();
    renderWithProviders(<RunStatusChip status={status} />);
    const chip = screen.getByText(t(STATUS_LABEL[status])).closest('.MuiChip-root');
    expect(chip).toHaveClass(colorClass[STATUS_COLORS[status]]);
  });
});

describe('RunsLegend', () => {
  it('keys every status colour and says how to reach a run’s details, under the tour anchors', () => {
    renderWithProviders(<RunsLegend />);
    const legend = screen.getByRole('region', { name: 'What the statuses mean' });
    expect(legend).toHaveAttribute('data-tour', 'runs-status');
    expect(legend.querySelectorAll('.MuiChip-root')).toHaveLength(7);
    expect(within(legend).getByText('Needs approval')).toBeInTheDocument();
    const details = screen.getByText(/Open any row to see each step it took/).closest('[data-tour]');
    expect(details).toHaveAttribute('data-tour', 'runs-details');
  });
});
