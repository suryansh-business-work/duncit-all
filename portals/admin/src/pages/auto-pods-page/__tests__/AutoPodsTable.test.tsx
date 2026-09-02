import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { shellAutoPodLabels } from '@duncit/utils';
import type { DuncitColumn } from '@duncit/table';
import AutoPodsTable from '../AutoPodsTable';
import type { AutoPodTableRow } from '../queries';

const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  return {
    ...actual,
    DuncitTable: (props: Record<string, unknown>) => {
      captured.props = props;
      const columns = props.columns as DuncitColumn<AutoPodTableRow>[];
      return (
        <div data-testid="duncit-table">
          <div data-testid="toolbar">{props.toolbarActions as React.ReactNode}</div>
          <div data-testid="headers">{columns.map((c) => c.headerName).join('|')}</div>
        </div>
      );
    },
  };
});

const t = (key: string) => key;
const labels = shellAutoPodLabels(t);

const makeRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'doc1',
  auto_pod_no: 'AP-1',
  stage: 'OPEN',
  is_active: true,
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  category_name: 'Adventure',
  category_path: ['Outdoors', 'Hiking', 'Adventure'],
  pod_amount: 500,
  no_of_spots: 10,
  pod_occurrence: 'ONE_TIME',
  pod_mode: 'PHYSICAL',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-01-02T08:00:00.000Z',
  updated_at: '2026-01-03T08:00:00.000Z',
  ...over,
});

describe('AutoPodsTable', () => {
  it('wires tableId, getRowId, emptyText, defaultSort and refetchRef into DuncitTable', () => {
    const refetchRef = { current: null };
    const fetchRows = vi.fn();
    render(
      <AutoPodsTable
        t={t}
        labels={labels}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={(v) => v}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        onViewPod={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );
    expect(captured.props).toMatchObject({
      tableId: 'admin-auto-pods',
      emptyText: 'admin.autoPods.empty',
      defaultSort: { field: 'created_at', dir: 'desc' },
      fetchRows,
      refetchRef,
    });
    const getRowId = captured.props?.getRowId as (row: AutoPodTableRow) => string;
    expect(getRowId(makeRow({ id: 'row-9' }))).toBe('row-9');
  });

  it('renders the passed-in toolbar actions', () => {
    render(
      <AutoPodsTable
        t={t}
        labels={labels}
        fetchRows={vi.fn()}
        refetchRef={{ current: null }}
        formatDateTime={(v) => v}
        toolbarActions={<button type="button">New Auto Pod</button>}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        onViewPod={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );
    expect(screen.getByTestId('toolbar')).toHaveTextContent('New Auto Pod');
  });

  it('builds the full auto-pod column set with the translated headers', () => {
    render(
      <AutoPodsTable
        t={t}
        labels={labels}
        fetchRows={vi.fn()}
        refetchRef={{ current: null }}
        formatDateTime={(v) => v}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
        onViewPod={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );
    expect(screen.getByTestId('headers')).toHaveTextContent(
      [
        'admin.autoPods.colAutoPodNo',
        'admin.autoPods.colTitle',
        'admin.autoPods.colCategory',
        'admin.autoPods.colDependency',
        'admin.autoPods.colStage',
        'admin.autoPods.colActive',
        'admin.autoPods.colCreatedAt',
        'admin.autoPods.colUpdatedAt',
        'admin.autoPods.colActions',
      ].join('|'),
    );
  });

  it('wires the row actions through to the real column callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onViewPod = vi.fn();
    const onToggleActive = vi.fn();
    render(
      <AutoPodsTable
        t={t}
        labels={labels}
        fetchRows={vi.fn()}
        refetchRef={{ current: null }}
        formatDateTime={(v) => v}
        onEdit={onEdit}
        onCancel={onCancel}
        onDelete={onDelete}
        onViewPod={onViewPod}
        onToggleActive={onToggleActive}
      />,
    );
    const columns = captured.props?.columns as DuncitColumn<AutoPodTableRow>[];
    const actionsCol = columns.find((c) => c.field === 'actions');
    if (!actionsCol?.cellRenderer) throw new Error('actions column missing a cellRenderer');
    const row = makeRow({ id: 'row-7', pod_id: 'pod-7', stage: 'OPEN' });
    const { getByRole } = render(<>{actionsCol.cellRenderer(row)}</>);
    // Every action sits in the row's three-dot menu, which closes after each pick.
    const pick = (label: string) => {
      fireEvent.click(getByRole('button', { name: 'admin.autoPods.moreActions' }));
      fireEvent.click(getByRole('menuitem', { name: label }));
    };
    pick('admin.autoPods.viewPod');
    pick('admin.autoPods.cancel');
    pick('admin.autoPods.edit');
    pick('admin.autoPods.delete');
    pick('admin.autoPods.deactivate');
    expect(onViewPod).toHaveBeenCalledWith(row);
    expect(onCancel).toHaveBeenCalledWith(row);
    expect(onEdit).toHaveBeenCalledWith(row);
    expect(onDelete).toHaveBeenCalledWith(row);
    expect(onToggleActive).toHaveBeenCalledWith(row);
  });
});
