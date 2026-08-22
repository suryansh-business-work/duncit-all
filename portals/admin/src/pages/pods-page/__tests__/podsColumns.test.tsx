import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { buildPodsColumns, type PodsColumnDeps } from '../podsColumns';
import type { PodRow } from '../queries';

const makePod = (over: Partial<PodRow> = {}): PodRow => ({
  id: 'doc1',
  pod_id: 'DUN-POD-1',
  pod_title: 'Hackathon Night',
  club_id: 'club1',
  venue_id: null,
  location_id: 'loc1',
  pod_mode: 'PHYSICAL',
  meeting_platform: null,
  pod_images_and_videos: null,
  pod_hits: 42,
  pod_attendees: ['u1', 'u2'],
  pod_date_time: '2026-03-04T10:30:00.000Z',
  pod_type: 'NATIVE_PAID',
  pod_amount: 500,
  no_of_spots: 10,
  product_requests: null,
  product_cost_total: null,
  is_active: true,
  completed_at: null,
  created_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

const makeDeps = (over: Partial<PodsColumnDeps> = {}): PodsColumnDeps => ({
  showProducts: false,
  clubName: (id) => `Club<${id}>`,
  venueName: (id) => `Venue<${id}>`,
  locName: (id) => `Loc<${id}>`,
  onEdit: vi.fn(),
  onQuickEdit: vi.fn(),
  onDelete: vi.fn(),
  onComplete: vi.fn(),
  onMonitor: vi.fn(),
  t: (key: string) => key,
  ...over,
});

const columnBy = (field: string, deps: Partial<PodsColumnDeps> = {}) => {
  const col = buildPodsColumns(makeDeps(deps)).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

const valueOf = (field: string, pod: PodRow, deps: Partial<PodsColumnDeps> = {}) =>
  columnBy(field, deps).valueGetter?.(pod);

const renderCell = (field: string, pod: PodRow, deps: Partial<PodsColumnDeps> = {}) => {
  const col = columnBy(field, deps);
  if (!col.cellRenderer) throw new Error(`column ${field} has no cellRenderer`);
  return render(<>{col.cellRenderer(pod)}</>);
};

describe('buildPodsColumns / column set', () => {
  it('builds the default column set in order, without the products column', () => {
    const fields = buildPodsColumns(makeDeps()).map((c) => c.field);
    expect(fields).toEqual([
      'cover',
      'pod_title',
      'club_id',
      'place',
      'pod_date_time',
      'pod_mode',
      'pod_type',
      'pod_amount',
      'no_of_spots',
      'pod_hits',
      'is_active',
      'completed_at',
      'created_at',
      'ai_monitor',
      'actions',
    ]);
  });

  it('labels every visible header the way the grid shows it', () => {
    const headers = Object.fromEntries(buildPodsColumns(makeDeps()).map((c) => [c.field, c.headerName]));
    expect(headers).toMatchObject({
      cover: 'Cover',
      pod_title: 'Title',
      club_id: 'Club',
      place: 'Venue',
      pod_date_time: 'Date / Time',
      pod_mode: 'Type',
      pod_type: 'Pod Type',
      pod_amount: 'Amount',
      no_of_spots: 'Spots',
      pod_hits: 'Hits',
      is_active: 'Status',
      actions: 'Actions',
    });
  });

  it('inserts Products between Amount and Spots when the products flag is on', () => {
    const fields = buildPodsColumns(makeDeps({ showProducts: true })).map((c) => c.field);
    expect(fields[7]).toBe('pod_amount');
    expect(fields[8]).toBe('products');
    expect(fields[9]).toBe('no_of_spots');
    expect(fields).toHaveLength(16);
  });

  it('hides the audit-only columns by default', () => {
    const hidden = buildPodsColumns(makeDeps())
      .filter((c) => c.hide)
      .map((c) => c.field);
    expect(hidden).toEqual(['pod_type', 'completed_at', 'created_at']);
  });

  it('offers the pod mode and pod type filter options the API accepts', () => {
    expect(columnBy('pod_mode').filter).toEqual({
      type: 'select',
      options: [
        { value: 'PHYSICAL', label: 'Physical' },
        { value: 'VIRTUAL', label: 'Virtual' },
      ],
    });
    expect(columnBy('pod_type').filter).toEqual({
      type: 'select',
      options: [
        { value: 'NATIVE_FREE', label: 'NATIVE FREE' },
        { value: 'NATIVE_PAID', label: 'NATIVE PAID' },
        { value: 'NATIVE_PAID_PREMIUM', label: 'NATIVE PAID PREMIUM' },
        { value: 'NON_NATIVE_FREE', label: 'NON NATIVE FREE' },
        { value: 'NON_NATIVE_PAID', label: 'NON NATIVE PAID' },
      ],
    });
  });
});

describe('buildPodsColumns / value getters', () => {
  it('sorts Title by the title text and Hits by the raw number', () => {
    expect(valueOf('pod_title', makePod({ pod_title: 'Zumba Social' }))).toBe('Zumba Social');
    expect(valueOf('pod_hits', makePod({ pod_hits: 137 }))).toBe(137);
  });

  it('resolves the club name through the injected lookup', () => {
    expect(valueOf('club_id', makePod({ club_id: 'club9' }))).toBe('Club<club9>');
  });

  it('shows the meeting platform for virtual pods', () => {
    expect(valueOf('place', makePod({ pod_mode: 'VIRTUAL', meeting_platform: 'Zoom' }))).toBe('Zoom');
  });

  it('falls back to "Virtual" when a virtual pod has no platform', () => {
    expect(valueOf('place', makePod({ pod_mode: 'VIRTUAL', meeting_platform: null }))).toBe('Virtual');
  });

  it('prefers the venue name over the location for physical pods', () => {
    expect(valueOf('place', makePod({ venue_id: 'v3', location_id: 'loc1' }))).toBe('Venue<v3>');
  });

  it('falls back to the location name when a physical pod has no venue', () => {
    expect(valueOf('place', makePod({ venue_id: null, location_id: 'loc7' }))).toBe('Loc<loc7>');
    expect(valueOf('place', makePod({ venue_id: null, location_id: null }))).toBe('Loc<>');
  });

  it('formats the pod date and dashes an empty one', () => {
    const iso = '2026-03-04T10:30:00.000Z';
    expect(valueOf('pod_date_time', makePod({ pod_date_time: iso }))).toBe(new Date(iso).toLocaleString());
    expect(valueOf('pod_date_time', makePod({ pod_date_time: null }))).toBe('—');
    expect(valueOf('completed_at', makePod({ completed_at: iso }))).toBe(new Date(iso).toLocaleString());
    expect(valueOf('created_at', makePod({ created_at: null }))).toBe('—');
  });

  it('joins mode and pod type for the searchable Type value', () => {
    expect(valueOf('pod_mode', makePod({ pod_mode: 'VIRTUAL', pod_type: 'NON_NATIVE_FREE' }))).toBe(
      'Virtual · NON NATIVE FREE',
    );
    expect(valueOf('pod_type', makePod({ pod_type: 'NATIVE_PAID_PREMIUM' }))).toBe('NATIVE PAID PREMIUM');
  });

  it('prints the amount with a currency prefix and "Free" at zero', () => {
    expect(valueOf('pod_amount', makePod({ pod_amount: 500 }))).toBe('₹500');
    expect(valueOf('pod_amount', makePod({ pod_amount: 0 }))).toBe('Free');
  });

  it('counts attendees against the capacity, dropping the cap when unlimited', () => {
    expect(valueOf('no_of_spots', makePod({ pod_attendees: ['a', 'b'], no_of_spots: 10 }))).toBe('2 / 10');
    expect(valueOf('no_of_spots', makePod({ pod_attendees: null, no_of_spots: null }))).toBe('0');
  });

  it('derives the status value with completed winning over active', () => {
    expect(valueOf('is_active', makePod({ completed_at: '2026-03-05T00:00:00.000Z', is_active: true }))).toBe(
      'Completed',
    );
    expect(valueOf('is_active', makePod({ is_active: true }))).toBe('Active');
    expect(valueOf('is_active', makePod({ is_active: false }))).toBe('Draft');
  });

  it('summarises the product requests with their total cost', () => {
    const pod = makePod({
      product_requests: [
        { product_id: 'p1', product_name: 'Pizza', quantity: 2 },
        { product_id: 'p2', product_name: 'Cola', quantity: 5 },
      ],
      product_cost_total: 1200,
    });
    expect(valueOf('products', pod, { showProducts: true })).toBe('Pizza: 2, Cola: 5 · ₹1200');
    expect(valueOf('products', makePod({ product_requests: [] }), { showProducts: true })).toBe('—');
  });
});

describe('buildPodsColumns / cell renderers', () => {
  it('plays a video cover when the first media item is a video', () => {
    const { container } = renderCell(
      'cover',
      makePod({ pod_images_and_videos: [{ url: 'https://cdn.test/clip.mp4', type: 'VIDEO' }] }),
    );
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.test/clip.mp4');
  });

  it('shows the image cover when the first media item is an image', () => {
    renderCell('cover', makePod({ pod_images_and_videos: [{ url: 'https://cdn.test/a.jpg', type: 'IMAGE' }] }));
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/a.jpg');
  });

  it('falls back to the first letter of the title when there is no media', () => {
    const { container } = renderCell('cover', makePod({ pod_images_and_videos: null, pod_title: 'Zumba' }));
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('stacks the pod title above its human pod id', () => {
    renderCell('pod_title', makePod({ pod_title: 'Hackathon Night', pod_id: 'DUN-POD-77' }));
    expect(screen.getByText('Hackathon Night')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-77')).toBeInTheDocument();
  });

  it('renders a mode chip and a de-underscored pod type chip', () => {
    renderCell('pod_mode', makePod({ pod_mode: 'VIRTUAL', pod_type: 'NATIVE_PAID_PREMIUM' }));
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('NATIVE PAID PREMIUM')).toBeInTheDocument();
  });

  it('renders the mode chip for a physical pod too', () => {
    renderCell('pod_mode', makePod({ pod_mode: 'PHYSICAL', pod_type: 'NON_NATIVE_FREE' }));
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('NON NATIVE FREE')).toBeInTheDocument();
  });

  it('greys the pod type chip for free pods and colours it for paid ones', () => {
    const free = renderCell('pod_mode', makePod({ pod_type: 'NATIVE_FREE' }));
    expect(free.getByText('NATIVE FREE').parentElement).toHaveClass('MuiChip-colorDefault');
    free.unmount();

    const paid = renderCell('pod_mode', makePod({ pod_type: 'NATIVE_PAID' }));
    expect(paid.getByText('NATIVE PAID').parentElement).toHaveClass('MuiChip-colorPrimary');
  });

  it('renders the hit counter', () => {
    renderCell('pod_hits', makePod({ pod_hits: 137 }));
    expect(screen.getByText('137')).toBeInTheDocument();
  });

  it('renders Completed / Active / Draft status chips', () => {
    const completed = renderCell('is_active', makePod({ completed_at: '2026-03-05T00:00:00.000Z' }));
    expect(completed.getByText('Completed')).toBeInTheDocument();
    completed.unmount();

    const active = renderCell('is_active', makePod({ is_active: true }));
    expect(active.getByText('Active')).toBeInTheDocument();
    active.unmount();

    const draft = renderCell('is_active', makePod({ is_active: false }));
    expect(draft.getByText('Draft')).toBeInTheDocument();
  });

  it('pluralises the product summary and dashes an empty basket', () => {
    const one = renderCell(
      'products',
      makePod({ product_requests: [{ product_id: 'p1', product_name: 'Pizza', quantity: 2 }], product_cost_total: 300 }),
      { showProducts: true },
    );
    expect(one.getByText('1 product · ₹300')).toBeInTheDocument();
    one.unmount();

    const many = renderCell(
      'products',
      makePod({
        product_requests: [
          { product_id: 'p1', product_name: 'Pizza', quantity: 2 },
          { product_id: 'p2', product_name: 'Cola', quantity: 5 },
        ],
        product_cost_total: 900,
      }),
      { showProducts: true },
    );
    expect(many.getByText('2 products · ₹900')).toBeInTheDocument();
    many.unmount();

    const none = renderCell('products', makePod({ product_requests: [] }), { showProducts: true });
    expect(none.container).toHaveTextContent('—');
    none.unmount();

    const missing = renderCell('products', makePod({ product_requests: null }), { showProducts: true });
    expect(missing.container).toHaveTextContent('—');
    expect(valueOf('products', makePod({ product_requests: null }), { showProducts: true })).toBe('—');
  });

  it('defaults a missing product cost total to zero', () => {
    renderCell(
      'products',
      makePod({ product_requests: [{ product_id: 'p1', product_name: 'Pizza', quantity: 1 }], product_cost_total: null }),
      { showProducts: true },
    );
    expect(screen.getByText('1 product · ₹0')).toBeInTheDocument();
  });

  it('hands the row to the matching action callback', () => {
    const deps = {
      onEdit: vi.fn(),
      onQuickEdit: vi.fn(),
      onDelete: vi.fn(),
      onComplete: vi.fn(),
    };
    const pod = makePod({ id: 'doc-42' });
    const { container } = renderCell('actions', pod, deps);
    const buttons = within(container).getAllByRole('button');

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);
    fireEvent.click(buttons[3]);

    expect(deps.onComplete).toHaveBeenCalledWith(pod);
    expect(deps.onQuickEdit).toHaveBeenCalledWith(pod);
    expect(deps.onEdit).toHaveBeenCalledWith(pod);
    expect(deps.onDelete).toHaveBeenCalledWith(pod);
  });
});
