import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { formatMoney, shellAutoPodLabels, type AutoPodLabels } from '@duncit/utils';
import { getAutoPodColumns, type AutoPodColumnDeps } from '../columns';
import { STAGE_LABEL_KEY } from '../helpers';
import type { AutoPodTableRow } from '../queries';

const t = (key: string) => key;
const labels: AutoPodLabels = shellAutoPodLabels(t);

const makeRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'doc1',
  auto_pod_no: 'AP-1',
  stage: 'OPEN',
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  category_name: 'Adventure',
  pod_amount: 500,
  no_of_spots: 10,
  pod_occurrence: 'ONE_TIME',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

const makeDeps = (over: Partial<AutoPodColumnDeps> = {}): AutoPodColumnDeps => ({
  t,
  labels,
  formatDateTime: (value: string) => `FMT<${value}>`,
  onEdit: vi.fn(),
  onCancel: vi.fn(),
  onDelete: vi.fn(),
  onViewPod: vi.fn(),
  ...over,
});

const columnBy = (field: string, deps: Partial<AutoPodColumnDeps> = {}) => {
  const col = getAutoPodColumns(makeDeps(deps)).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

const valueOf = (field: string, row: AutoPodTableRow, deps: Partial<AutoPodColumnDeps> = {}) =>
  columnBy(field, deps).valueGetter?.(row);

const renderCell = (field: string, row: AutoPodTableRow, deps: Partial<AutoPodColumnDeps> = {}) => {
  const col = columnBy(field, deps);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(row)}</>);
};

describe('getAutoPodColumns / column set', () => {
  it('builds every column in order', () => {
    const fields = getAutoPodColumns(makeDeps()).map((c) => c.field);
    expect(fields).toEqual([
      'auto_pod_no',
      'pod_title',
      'category_name',
      'location',
      'pod_amount',
      'no_of_spots',
      'enrolments',
      'stage',
      'venue_claim',
      'host_claim',
      'club_claim',
      'created_at',
      'actions',
    ]);
  });

  it('offers the six stages, in enrolment order, as the stage filter options', () => {
    expect(columnBy('stage').filter).toEqual({
      type: 'select',
      options: [
        { value: 'OPEN', label: STAGE_LABEL_KEY.OPEN },
        { value: 'CLAIMING', label: STAGE_LABEL_KEY.CLAIMING },
        { value: 'MATERIALIZING', label: STAGE_LABEL_KEY.MATERIALIZING },
        { value: 'LIVE', label: STAGE_LABEL_KEY.LIVE },
        { value: 'CANCELLED', label: STAGE_LABEL_KEY.CANCELLED },
        { value: 'EXPIRED', label: STAGE_LABEL_KEY.EXPIRED },
      ],
    });
  });

  it('only makes pod_amount and created_at server-filterable, and drops sortability off derived columns', () => {
    expect(columnBy('pod_amount').filter).toEqual({ type: 'number' });
    expect(columnBy('created_at').filter).toEqual({ type: 'date' });
    expect(columnBy('category_name').sortable).toBe(false);
    expect(columnBy('location').sortable).toBe(false);
    expect(columnBy('enrolments').sortable).toBe(false);
    expect(columnBy('venue_claim').sortable).toBe(false);
    expect(columnBy('host_claim').sortable).toBe(false);
    expect(columnBy('club_claim').sortable).toBe(false);
    expect(columnBy('auto_pod_no').filter).toBeUndefined();
  });
});

describe('getAutoPodColumns / value getters', () => {
  it('reads the title straight off the row', () => {
    expect(valueOf('pod_title', makeRow({ pod_title: 'Sunset Hike' }))).toBe('Sunset Hike');
  });

  it('dashes a missing category', () => {
    expect(valueOf('category_name', makeRow({ category_name: 'Adventure' }))).toBe('Adventure');
    expect(valueOf('category_name', makeRow({ category_name: null }))).toBe('—');
  });

  it('shows the pinned city or falls back to "any city" copy', () => {
    expect(
      valueOf(
        'location',
        makeRow({
          location: {
            location_id: 'l1',
            location_name: 'HSR',
            country: 'India',
            state: 'Karnataka',
            city: 'Bengaluru',
            bound_by: 'VENUE',
            bound_at: '2026-01-01T00:00:00.000Z',
          },
        }),
      ),
    ).toBe('Bengaluru, Karnataka');
    expect(valueOf('location', makeRow({ location: null }))).toBe('admin.autoPods.anyCity');
  });

  it('formats the price through the shared money formatter', () => {
    expect(valueOf('pod_amount', makeRow({ pod_amount: 750 }))).toBe(formatMoney(750));
    expect(valueOf('pod_amount', makeRow({ pod_amount: 0 }))).toBe(formatMoney(0));
  });

  it('reads the spot count straight off the row', () => {
    expect(valueOf('no_of_spots', makeRow({ no_of_spots: 12 }))).toBe(12);
  });

  it('composes the enrolments search value from the three claim names', () => {
    expect(valueOf('enrolments', makeRow())).toBe('— / — / —');
    expect(
      valueOf(
        'enrolments',
        makeRow({
          venue_claim: {
            venue_id: 'v1',
            venue_slot_id: 's1',
            owner_user_id: 'u1',
            venue_name: 'Lotus Studio',
            pod_date_time: '2026-02-01T10:00:00.000Z',
            pod_end_date_time: null,
            slot_price: 1000,
            accepted_at: '2026-01-05T00:00:00.000Z',
          },
          host_claim: { user_id: 'u2', host_name: 'Jane Doe', assigned_at: '2026-01-06T00:00:00.000Z' },
        }),
      ),
    ).toBe('Lotus Studio / Jane Doe / —');
  });

  it('translates the stage for the searchable value', () => {
    expect(valueOf('stage', makeRow({ stage: 'LIVE' }))).toBe(STAGE_LABEL_KEY.LIVE);
  });

  it('resolves each claim column to its own name lookup', () => {
    const row = makeRow({
      venue_claim: {
        venue_id: 'v1',
        venue_slot_id: 's1',
        owner_user_id: 'u1',
        venue_name: 'Lotus Studio',
        pod_date_time: '2026-02-01T10:00:00.000Z',
        pod_end_date_time: null,
        slot_price: 1000,
        accepted_at: '2026-01-05T00:00:00.000Z',
      },
      host_claim: { user_id: 'u2', host_name: 'Jane Doe', assigned_at: '2026-01-06T00:00:00.000Z' },
      club_claim: { club_id: 'c1', club_name: 'Chess Club', user_id: 'u3', claimed_at: '2026-01-07T00:00:00.000Z' },
    });
    expect(valueOf('venue_claim', row)).toBe('Lotus Studio');
    expect(valueOf('host_claim', row)).toBe('Jane Doe');
    expect(valueOf('club_claim', row)).toBe('Chess Club');
  });

  it('formats created_at through the injected formatter, dashing a missing one', () => {
    expect(valueOf('created_at', makeRow({ created_at: '2026-01-02T08:00:00.000Z' }))).toBe(
      'FMT<2026-01-02T08:00:00.000Z>',
    );
    expect(valueOf('created_at', makeRow({ created_at: '' as unknown as string }))).toBe('—');
  });
});

describe('getAutoPodColumns / cell renderers', () => {
  it('renders the entity id, monospaced, with an em-dash fallback', () => {
    renderCell('auto_pod_no', makeRow({ auto_pod_no: 'AP-42' }));
    expect(screen.getByText('AP-42')).toBeInTheDocument();
  });

  it('renders the three enrolment ticks, amber while pending and green once done', () => {
    const row = makeRow({
      host_claim: { user_id: 'u2', host_name: 'Jane Doe', assigned_at: '2026-01-06T00:00:00.000Z' },
    });
    const { container } = renderCell('enrolments', row);
    // Host tick is done (filled/success), venue and club are still pending.
    expect(container.querySelectorAll('.MuiChip-colorSuccess')).toHaveLength(1);
    expect(container.querySelectorAll('.MuiChip-colorWarning')).toHaveLength(2);
  });

  it('renders the stage chip for the row', () => {
    renderCell('stage', makeRow({ stage: 'CANCELLED' }));
    expect(screen.getByText(STAGE_LABEL_KEY.CANCELLED)).toBeInTheDocument();
  });

  it('renders View Pod and Cancel actions, wired to the row callbacks', () => {
    const onViewPod = vi.fn();
    const onCancel = vi.fn();
    const row = makeRow({ pod_id: 'pod-1', stage: 'OPEN' });
    const { container } = renderCell('actions', row, { onViewPod, onCancel });
    const buttons = within(container).getAllByRole('button');
    // View Pod, Cancel — Edit/Delete are hooked through actionsColumn's own onEdit/onDelete below.
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onViewPod).toHaveBeenCalledWith(row);
    expect(onCancel).toHaveBeenCalledWith(row);
  });

  it('hides the View Pod button before the offer has materialized', () => {
    renderCell('actions', makeRow({ pod_id: null, stage: 'OPEN' }));
    expect(screen.queryByRole('button', { name: 'admin.autoPods.viewPod' })).not.toBeInTheDocument();
    // Cancel, Edit and Delete are unaffected by the missing pod id.
    expect(screen.getByRole('button', { name: 'admin.autoPods.cancel' })).toBeInTheDocument();
  });

  it('disables Edit and Delete once the offer is live, with the live hint as the tooltip/aria-label', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const row = makeRow({ stage: 'LIVE', pod_id: 'pod-1' });
    renderCell('actions', row, { onEdit, onDelete });
    // Disabled buttons swap their aria-label to the disabledTitle hint.
    expect(screen.getByRole('button', { name: 'admin.autoPods.editLiveHint' })).toBeDisabled();
    // A LIVE row is not deletable either (isAutoPodDeletable excludes LIVE/MATERIALIZING).
    expect(screen.getByRole('button', { name: 'admin.autoPods.deleteLiveHint' })).toBeDisabled();
  });

  it('enables Edit and allows Delete while the offer is still pre-live', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const row = makeRow({ stage: 'OPEN' });
    renderCell('actions', row, { onEdit, onDelete });
    const editBtn = screen.getByRole('button', { name: 'admin.autoPods.edit' });
    const deleteBtn = screen.getByRole('button', { name: 'admin.autoPods.delete' });
    expect(editBtn).toBeEnabled();
    expect(deleteBtn).toBeEnabled();
    fireEvent.click(editBtn);
    fireEvent.click(deleteBtn);
    expect(onEdit).toHaveBeenCalledWith(row);
    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it('disables both Edit and Delete once a pod is materializing (no longer pre-live either)', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const row = makeRow({ stage: 'MATERIALIZING' });
    renderCell('actions', row, { onEdit, onDelete });
    expect(screen.getByRole('button', { name: 'admin.autoPods.editLiveHint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'admin.autoPods.deleteLiveHint' })).toBeDisabled();
  });
});
