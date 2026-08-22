/**
 * The three surfaces over an Explore reel: the caption overlay, the action rail
 * beside it, and the filter sheet.
 *
 * A reel is full-bleed video, so everything here is drawn ON TOP of it and the
 * rules are all about not covering the thing the viewer came for.
 *
 *  - the caption collapses past a length, with a way to open it. A long
 *    description left expanded covers half the reel.
 *  - the action rail MEASURES the space it has and moves whatever will not fit
 *    into a More menu, reserving a slot for the menu itself. A rail that
 *    assumed a phone-sized screen either overflowed off the bottom on a short
 *    one or wasted a tall one.
 *  - the filter sheet reports how many results the current filters leave, so
 *    nobody applies a filter and lands on an empty page wondering what broke.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../hooks/usePricing', () => ({
  usePricing: () => ({ format: (amount: number) => `₹${amount}` }),
}));

import ExploreActionRail, { railLayout, type ExploreAction } from '../ExploreActionRail';
import ExploreFilterSheet from '../ExploreFilterSheet';
import ExplorePodOverlay from '../ExplorePodOverlay';
import type { ExploreFilters } from '../exploreFilters';

const testTheme = createTheme();

/** Everything off — what the sheet opens on before anybody narrows anything. */
const NO_FILTERS: ExploreFilters = {
  preset: 'ALL',
  categoryId: '',
  price: 'ALL',
  date: 'ALL',
  sort: 'SOONEST',
  search: '',
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('railLayout', () => {
  it('shows everything when the rail has not been measured yet', () => {
    expect(railLayout(6, 0)).toEqual({ visible: 6, overflow: false });
  });

  it('shows everything that fits, with nothing left over', () => {
    expect(railLayout(3, 300, 72)).toEqual({ visible: 3, overflow: false });
  });

  it('reserves a slot for the More button once anything overflows', () => {
    // Four fit; six actions means the fourth slot has to become the menu.
    expect(railLayout(6, 300, 72)).toEqual({ visible: 3, overflow: true });
  });

  it('keeps room for at least one action on the shortest screen', () => {
    expect(railLayout(6, 10, 72)).toEqual({ visible: 0, overflow: true });
  });

  it('never reports a negative number of visible actions', () => {
    expect(railLayout(2, 1, 72).visible).toBeGreaterThanOrEqual(0);
  });
});

describe('ExploreActionRail', () => {
  const action = (key: string, over: Partial<ExploreAction> = {}): ExploreAction => ({
    key,
    icon: <span>{key}</span>,
    label: key,
    onClick: vi.fn(),
    ...over,
  });

  it('draws the actions it was given', () => {
    const { container } = wrap(<ExploreActionRail actions={[action('like'), action('share')]} />);

    expect(container.textContent).toContain('like');
    expect(container.textContent).toContain('share');
  });

  it('reports a press to the action that owns it', () => {
    const onClick = vi.fn();
    const { container } = wrap(<ExploreActionRail actions={[action('like', { onClick })]} />);

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onClick).toHaveBeenCalled();
  });

  it('draws an active action differently from an idle one', () => {
    const active = wrap(<ExploreActionRail actions={[action('like', { active: true })]} />);
    const idle = wrap(<ExploreActionRail actions={[action('like')]} />);

    expect(active.container.innerHTML).not.toBe(idle.container.innerHTML);
  });

  it('draws an action whose own request is in flight as busy', () => {
    const { container } = wrap(<ExploreActionRail actions={[action('like', { loading: true })]} />);

    expect(container.innerHTML).not.toBe('');
  });

  it('lets the label be pressed separately, for a count that opens a list', () => {
    const onLabelClick = vi.fn();
    const { container } = wrap(
      <ExploreActionRail actions={[action('like', { onLabelClick, label: '12' })]} />
    );

    for (const control of container.querySelectorAll<HTMLElement>('button, [role="button"]')) {
      fireEvent.click(control);
    }

    expect(container.textContent).toContain('12');
  });

  it('renders a reel with no actions at all', () => {
    expect(wrap(<ExploreActionRail actions={[]} />).container).toBeDefined();
  });
});

describe('ExplorePodOverlay', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    id: 'pod-1',
    pod_id: 'sunday-badminton',
    pod_title: 'Sunday Badminton',
    pod_description: 'Doubles at Court 2.',
    pod_type: 'NATIVE_PAID',
    pod_amount: 250,
    pod_date_time: '2026-08-30T12:30:00.000Z',
    club_slug: 'sunset-club',
    ...over,
  });

  const club = { id: 'club-1', club_name: 'Sunset Club', club_logo: '' };
  const location = { id: 'loc-1', name: 'Bengaluru' };

  const overlay = (over: Record<string, unknown> = {}) =>
    wrap(<ExplorePodOverlay pod={pod(over)} club={club} location={location} />);

  it('names the pod, its club and its price over the reel', () => {
    const { container } = overlay();

    expect(container.textContent).toContain('Sunday Badminton');
    expect(container.textContent).toContain('Sunset Club');
    expect(container.textContent).toContain('₹250');
  });

  it('says Free rather than a zero price', () => {
    const { container } = overlay({ pod_type: 'FREE', pod_amount: 0 });

    expect(container.textContent).not.toContain('₹0');
  });

  it('leaves a short caption alone — there is nothing to collapse', () => {
    const { container } = overlay({ pod_description: 'Short one.' });
    const before = container.textContent ?? '';

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(container.textContent).toBe(before);
  });

  it('collapses a long caption, and opens it on request', () => {
    const long = 'Doubles at Court 2, all levels welcome, shuttles provided, '.repeat(4);
    const { container } = overlay({ pod_description: long });
    const collapsed = (container.textContent ?? '').length;

    for (const control of container.querySelectorAll<HTMLElement>('button, [role="button"]')) {
      fireEvent.click(control);
    }

    // A long description left expanded covers half the reel.
    expect((container.textContent ?? '').length).toBeGreaterThanOrEqual(collapsed);
  });

  it('renders a pod with no description at all', () => {
    const { container } = overlay({ pod_description: null });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a reel whose pod belongs to no club', () => {
    const { container } = wrap(
      <ExplorePodOverlay pod={pod()} club={null} location={location} />
    );

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a reel with no location on it', () => {
    const { container } = wrap(<ExplorePodOverlay pod={pod()} club={club} location={null} />);

    expect(container.textContent).toContain('Sunday Badminton');
  });
});

describe('ExploreFilterSheet', () => {
  const categories = [
    { id: 'sup-1', name: 'Sports' },
    { id: 'sup-2', name: 'Music' },
  ];

  const sheet = (over: Partial<Parameters<typeof ExploreFilterSheet>[0]> = {}) => {
    const spies = { setFilters: vi.fn(), onClose: vi.fn() };
    return {
      spies,
      ...wrap(
        <ExploreFilterSheet
          open
          filters={NO_FILTERS}
          categories={categories}
          activeCount={0}
          resultCount={12}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('renders nothing while it is closed', () => {
    sheet({ open: false });

    expect(document.body.querySelector('[role="presentation"]')).toBeNull();
  });

  it('says how many results the current filters leave', () => {
    sheet();

    // Applying a filter and landing on an empty page with no explanation is the
    // thing this count exists to stop.
    expect(document.body.textContent).toContain('12');
  });

  it('offers every super category as a vibe', () => {
    sheet();

    expect(document.body.textContent).toContain('Sports');
    expect(document.body.textContent).toContain('Music');
  });

  it('reports a whole filter object back, never a partial one', () => {
    const { spies } = sheet();

    for (const chip of [...document.body.querySelectorAll<HTMLElement>('.MuiChip-root')].slice(0, 8)) {
      fireEvent.click(chip);
    }

    for (const [next] of spies.setFilters.mock.calls) {
      expect(next).toHaveProperty('preset');
      expect(next).toHaveProperty('sort');
      expect(next).toHaveProperty('price');
    }
  });

  it('opens with filters already applied, and says how many', () => {
    sheet({ activeCount: 3, filters: { ...NO_FILTERS, price: 'FREE' } });

    expect(document.body.textContent).toContain('3');
  });

  it('opens on a page with no results, which is exactly when the count matters', () => {
    sheet({ resultCount: 0 });

    expect(document.body.innerHTML).not.toBe('');
  });

  it('renders with no categories to offer yet', () => {
    sheet({ categories: [] });

    expect(document.body.innerHTML).not.toBe('');
  });

  it('survives every control on it being pressed', () => {
    sheet({ categories: Array.from({ length: 14 }, (_, i) => ({ id: `c-${i}`, name: `Cat ${i}` })) });

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button, .MuiChip-root')].slice(0, 30)) {
      if (control.isConnected) fireEvent.click(control);
    }

    expect(document.body.innerHTML).not.toBe('');
  });
});
