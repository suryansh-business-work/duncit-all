import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { shellAutoPodLabels, type AutoPodLabels } from '@duncit/utils';
import { getAutoPodColumns, type AutoPodColumnDeps } from '../columns';
import { STAGE_LABEL_KEY } from '../helpers';
import type { AutoPodTableRow } from '../queries';

const t = (key: string) => key;
const labels: AutoPodLabels = shellAutoPodLabels(t);

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
  updated_at: '2026-01-03T09:30:00.000Z',
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
  onToggleActive: vi.fn(),
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

const HOST = { user_id: 'u2', host_name: 'Jane Doe', assigned_at: '2026-01-06T00:00:00.000Z' };

describe('getAutoPodColumns / column set', () => {
  it('builds the PRD column set in order: id, title, category, dependency, stage, status, created, updated, actions', () => {
    const fields = getAutoPodColumns(makeDeps()).map((c) => c.field);
    expect(fields).toEqual([
      'auto_pod_no',
      'pod_title',
      'category_path',
      'pending',
      'stage',
      'is_active',
      'created_at',
      'updated_at',
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

  it('filters the dependency column by which role is still pending — several at once', () => {
    expect(columnBy('pending').filter).toEqual({
      type: 'select',
      multiple: true,
      options: [
        { value: 'VENUE', label: 'admin.autoPods.pendingVenue' },
        { value: 'HOST', label: 'admin.autoPods.pendingHost' },
        { value: 'CLUB', label: 'admin.autoPods.pendingClub' },
      ],
    });
  });

  it('makes only the dates and the status server-filterable, and drops sortability off derived columns', () => {
    expect(columnBy('created_at').filter).toEqual({ type: 'date' });
    expect(columnBy('updated_at').filter).toEqual({ type: 'date' });
    expect(columnBy('is_active').filter).toEqual({ type: 'boolean' });
    expect(columnBy('category_path').sortable).toBe(false);
    expect(columnBy('pending').sortable).toBe(false);
    expect(columnBy('actions').sortable).toBe(false);
    expect(columnBy('auto_pod_no').filter).toBeUndefined();
  });
});

describe('getAutoPodColumns / value getters', () => {
  it('reads the title straight off the row', () => {
    expect(valueOf('pod_title', makeRow({ pod_title: 'Sunset Hike' }))).toBe('Sunset Hike');
  });

  it('joins the category path, skipping blanks, and dashes an empty one', () => {
    expect(valueOf('category_path', makeRow())).toBe('Outdoors › Hiking › Adventure');
    expect(valueOf('category_path', makeRow({ category_path: ['Outdoors', '', 'Adventure'] }))).toBe('Outdoors › Adventure');
    expect(valueOf('category_path', makeRow({ category_path: [] }))).toBe('—');
  });

  it('composes the dependency search value from the three claim names', () => {
    expect(valueOf('pending', makeRow())).toBe('— / — / —');
    expect(
      valueOf(
        'pending',
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
          host_claim: HOST,
        }),
      ),
    ).toBe('Lotus Studio / Jane Doe / —');
  });

  it('translates the stage for the searchable value', () => {
    expect(valueOf('stage', makeRow({ stage: 'LIVE' }))).toBe(STAGE_LABEL_KEY.LIVE);
  });

  it('names the status by the admin copy', () => {
    expect(valueOf('is_active', makeRow({ is_active: true }))).toBe('admin.autoPods.active');
    expect(valueOf('is_active', makeRow({ is_active: false }))).toBe('admin.autoPods.paused');
  });

  it('formats both dates through the injected formatter, dashing a missing one', () => {
    expect(valueOf('created_at', makeRow())).toBe('FMT<2026-01-02T08:00:00.000Z>');
    expect(valueOf('updated_at', makeRow())).toBe('FMT<2026-01-03T09:30:00.000Z>');
    expect(valueOf('updated_at', makeRow({ updated_at: '' }))).toBe('—');
  });
});

describe('getAutoPodColumns / cell renderers', () => {
  it('renders the entity id, monospaced, with an em-dash fallback', () => {
    renderCell('auto_pod_no', makeRow({ auto_pod_no: 'AP-42' }));
    expect(screen.getByText('AP-42')).toBeInTheDocument();
  });

  it('renders the dependency line: Venue → Host → Club Admin, the enrolled one green with its name', () => {
    renderCell('pending', makeRow({ host_claim: HOST }));
    const timeline = screen.getByTestId('auto-pod-dependency');
    expect(timeline).toHaveTextContent('Jane Doe');
    expect(screen.getByLabelText(`${labels.tick('host')} — ${labels.tickDone}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${labels.tick('venue')} — ${labels.tickPending}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${labels.tick('club')} — ${labels.tickPending}`)).toBeInTheDocument();
  });

  it('renders the stage chip for the row', () => {
    renderCell('stage', makeRow({ stage: 'CANCELLED' }));
    expect(screen.getByText(STAGE_LABEL_KEY.CANCELLED)).toBeInTheDocument();
  });

  it('renders the status chip', () => {
    renderCell('is_active', makeRow({ is_active: false }));
    expect(screen.getByText('admin.autoPods.paused')).toBeInTheDocument();
  });

  it('renders the row menu, wired to every callback', () => {
    const onToggleActive = vi.fn();
    const onEdit = vi.fn();
    const row = makeRow();
    renderCell('actions', row, { onToggleActive, onEdit });
    fireEvent.click(screen.getByRole('button', { name: 'admin.autoPods.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'admin.autoPods.deactivate' }));
    expect(onToggleActive).toHaveBeenCalledWith(row);
    fireEvent.click(screen.getByRole('button', { name: 'admin.autoPods.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'admin.autoPods.edit' }));
    expect(onEdit).toHaveBeenCalledWith(row);
  });
});
