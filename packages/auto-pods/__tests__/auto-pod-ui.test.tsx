/**
 * The Auto Pod queue as each partner reads it.
 *
 * An Auto Pod becomes a real pod only once a venue, a host AND a club admin
 * have all enrolled, so the card's whole job is to say where that has got to
 * and what this particular viewer can still do. The tick row is always three
 * wide for the same reason — a card must not change shape as partners join.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, shellPodKindLabels, type AutoPodLocation, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoPodCard } from '../src/AutoPodCard';
import { AutoPodQueue } from '../src/AutoPodQueue';
import { MY_HOST_CATEGORIES_FOR_AUTO_POD } from '../src/queries';
import { AutoPodTicks } from '../src/AutoPodTicks';
import { AutoPodCategoryFilter } from '../src/AutoPodCategoryFilter';
import { PodKindChooser } from '../src/PodKindChooser';

/** Echoes the key back, so an assertion reads as the key that was rendered. */
const t = (key: string) => key;
const labels = mwebAutoPodLabels(t);
const kindLabels = shellPodKindLabels(t);

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow => (({
  id: 'ap-1',
  auto_pod_no: 'DUN-AP-001',
  stage: 'OPEN',
  pod_title: 'Weekly Badminton',
  pod_description: 'Doubles, all levels.',
  pod_images_and_videos: [{ url: 'https://cdn.duncit.com/auto/a.jpg', type: 'IMAGE' }],
  sub_category_id: 'sub-1',
  category_name: 'Badminton',
  pod_amount: 250,
  no_of_spots: 8,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  viewer_claimed: false,
  pod_id: null,
  expected_host_earnings: 1400,
  ...over
}) as AutoPodRow);

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrapped = (ui: ReactNode) => render(<MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('AutoPodTicks', () => {
  it('always renders three ticks, so a card never changes width as partners enrol', () => {
    const { container } = render(
      <AutoPodTicks row={{ venue_claim: null, host_claim: null, club_claim: null }} labels={labels} />
    );

    expect(container.innerHTML).not.toBe('');
    const partial = render(
      <AutoPodTicks
        row={{
          venue_claim: { venue_id: 'v-1' } as never,
          host_claim: null,
          club_claim: null,
        }}
        labels={labels}
      />
    );
    expect(partial.container.innerHTML).not.toBe('');
  });

  it('renders at either size', () => {
    for (const size of ['small', 'medium'] as const) {
      const { container } = render(
        <AutoPodTicks row={{ venue_claim: null, host_claim: null, club_claim: null }} labels={labels} size={size} />
      );
      expect(container.innerHTML).not.toBe('');
    }
  });
});

describe('AutoPodCard', () => {
  it('shows the pod, its number and the money, all through the caller formatters', () => {
    const { container } = render(
      <AutoPodCard role="host" row={row()} labels={labels} formatWhen={formatWhen} formatMoney={formatMoney} />
    );

    expect(container.textContent).toContain('Weekly Badminton');
    expect(container.textContent).toContain('₹250');
  });

  it('renders the role action the caller owns', () => {
    render(
      <AutoPodCard
        role="host"
        row={row()}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        action={<button type="button">Enrol my venue</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Enrol my venue' })).toBeInTheDocument();
  });

  it('renders a row with no image rather than a broken one', () => {
    const { container } = render(
      <AutoPodCard
        role="host"
        row={row({ pod_images_and_videos: [] })}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    );

    expect(container.textContent).toContain('Weekly Badminton');
  });

  it('renders a row this viewer has already enrolled in', () => {
    const { container } = render(
      <AutoPodCard
        role="host"
        row={row({ viewer_claimed: true, pod_id: 'pod-9' })}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    );

    expect(container.innerHTML).not.toBe('');
  });
});

describe('AutoPodQueue', () => {
  const queue = (over: Record<string, unknown> = {}) =>
    wrapped(
      <AutoPodQueue
        role="venue"
        rows={[row(), row({ id: 'ap-2', auto_pod_no: 'DUN-AP-002', pod_title: 'Sunday Chess' })]}
        labels={labels}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={() => <button type="button">Enrol</button>}
        {...(over as never)}
      />
    );

  it('lists every open Auto Pod', async () => {
    const { container } = queue();
    await settle();

    expect(container.textContent).toContain('Weekly Badminton');
    expect(container.textContent).toContain('Sunday Chess');
  });

  // The second section is titled for the role: "Assigned slot" for a venue,
  // "Assigned Auto Pods" for a host, "Final assigned Auto Pods" for a club admin.
  it('titles a role’s own enrolments with that role’s heading', async () => {
    const mine = row({ id: 'ap-mine', stage: 'CLAIMING', viewer_claimed: true });
    const { container, rerender } = queue({ role: 'venue', rows: [row(), mine] });
    await settle();
    expect(container.textContent).toContain(labels.assignedHeading('venue'));
    expect(container.textContent).toContain(labels.needsAction);

    rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ThemeProvider theme={testTheme}>
          <AutoPodQueue
            role="club"
            rows={[mine]}
            labels={labels}
            loading={false}
            error={false}
            onRetry={vi.fn()}
            formatWhen={formatWhen}
            formatMoney={formatMoney}
            renderAction={() => null}
          />
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();
    expect(container.textContent).toContain(labels.assignedHeading('club'));
    expect(container.textContent).not.toContain(labels.assignedHeading('venue'));
  });

  it('shows a loading state rather than an empty list while it waits', async () => {
    const { container } = queue({ loading: true, rows: [] });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('offers a retry when the queue failed to load', async () => {
    const onRetry = vi.fn();
    queue({ error: true, rows: [], onRetry });
    await settle();

    const retry = screen.queryAllByRole('button')[0];
    if (retry) {
      fireEvent.click(retry);
      expect(onRetry).toHaveBeenCalled();
    }
  });

  it('renders an empty queue', async () => {
    const { container } = queue({ rows: [] });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders the already-enrolled slot for a row this viewer joined', async () => {
    const { container } = queue({
      rows: [row({ viewer_claimed: true, pod_id: 'pod-9' })],
      renderMineAction: () => <span>Open the pod</span>,
    });
    await settle();

    expect(container.textContent).toContain('Open the pod');
  });

  // Enrolment runs venue → host → club admin, so each reader is handed a row
  // that is on their turn: fresh for the venue, dated for the host, hosted for
  // the club admin.
  it.each(['venue', 'host', 'club'] as const)('renders for the %s reader', async (role) => {
    const onTurn: Record<typeof role, Partial<AutoPodRow>> = {
      venue: {},
      host: { stage: 'CLAIMING', venue_claim: VENUE_CLAIM },
      club: {
        stage: 'CLAIMING',
        venue_claim: VENUE_CLAIM,
        host_claim: { user_id: 'u-1', host_name: 'Asha', assigned_at: '2026-08-21T10:00:00.000Z' },
      },
    };
    const { container } = queue({ role, rows: [row(onTurn[role])] });
    await settle();

    expect(container.textContent).toContain('Weekly Badminton');
  });
});

describe('PodKindChooser', () => {
  it('renders nothing while it is closed', () => {
    render(<PodKindChooser open={false} labels={kindLabels} onClose={vi.fn()} onPick={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('offers the kinds and reports the one that was picked', async () => {
    const onPick = vi.fn();
    render(<PodKindChooser open labels={kindLabels} onClose={vi.fn()} onPick={onPick} />);
    await settle();

    const choices = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')];
    expect(choices.length).toBeGreaterThan(0);

    for (const choice of choices) {
      if (!choice.isConnected) continue;
      fireEvent.click(choice);
      await settle();
    }

    for (const [kind] of onPick.mock.calls) expect(typeof kind).toBe('string');
  });
});

const BENGALURU: AutoPodLocation = {
  location_id: 'loc-blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE',
  bound_at: '2026-08-20T10:00:00.000Z',
};

const VENUE_CLAIM = {
  venue_id: 'v-1',
  venue_slot_id: 'slot-1',
  owner_user_id: 'owner-1',
  venue_name: 'Indiranagar Court',
  pod_date_time: '2026-09-01T10:00:00.000Z',
  pod_end_date_time: null,
  slot_price: 500,
  accepted_at: '2026-08-20T10:00:00.000Z',
};

const card = (over: Partial<AutoPodRow> = {}) =>
  render(
    <AutoPodCard role="host" row={row(over)} labels={labels} formatWhen={formatWhen} formatMoney={formatMoney} />
  );

describe('AutoPodCard details', () => {
  it('names the city an offer is pinned to, and says so when nobody has pinned one', () => {
    expect(card({ location: BENGALURU }).container.textContent).toContain(
      labels.pinnedTo('Bengaluru, Karnataka')
    );
    expect(card().container.textContent).toContain(labels.unpinned);
  });

  it('adds the venue and its slot only once a venue has committed one', () => {
    const withVenue = card({ venue_claim: VENUE_CLAIM }).container.textContent ?? '';
    expect(withVenue).toContain('Indiranagar Court');
    expect(withVenue).toContain('when:2026-09-01T10:00:00.000Z');

    expect(card().container.textContent).not.toContain('Indiranagar Court');
  });

  it('appends the category to the Auto Pod number, and leaves it off when there is none', () => {
    expect(card().container.textContent).toContain('DUN-AP-001 · Badminton');
    expect(card({ category_name: null }).container.textContent).toContain('DUN-AP-001');
  });

  it('states the earnings once the server has worked them out, and says so plainly until then', () => {
    expect(card().container.textContent).toContain(labels.expectedEarnings('₹1400'));

    const unpriced = card({ expected_host_earnings: null }).container.textContent;
    expect(unpriced).not.toContain(labels.expectedEarnings('₹1400'));
    expect(unpriced).toContain(labels.earningsUnknown);
  });

  // Each partner is paid for something different — the venue for the seats its
  // space holds, the host for what is left after every deduction — so a shared
  // card must read its OWN role's figure. It used to show every role the
  // host's payout.
  it('reads the figure belonging to the role whose queue the card is in', () => {
    const earnings = {
      expected_venue_earnings: 5000,
      expected_host_earnings: 1400,
      expected_club_earnings: 115,
    };
    const forRole = (role: 'venue' | 'host' | 'club') =>
      wrapped(
        <AutoPodCard
          role={role}
          row={row(earnings)}
          labels={labels}
          formatWhen={formatWhen}
          formatMoney={formatMoney}
        />
      ).container.textContent;

    expect(forRole('venue')).toContain(labels.expectedEarnings('₹5000'));
    expect(forRole('host')).toContain(labels.expectedEarnings('₹1400'));
    expect(forRole('club')).toContain(labels.expectedEarnings('₹115'));
  });

  // What the viewer typed into their own calculator is the number they are
  // reasoning about, so it outranks whatever the server last said.
  it('lets this viewer’s own estimate override the server’s figure', () => {
    const { container } = wrapped(
      <AutoPodCard
        role="host"
        row={row()}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        earnings={9999}
        earningsAction={<button type="button">calculate</button>}
      />
    );

    expect(container.textContent).toContain(labels.expectedEarnings('₹9999'));
    expect(screen.getByRole('button', { name: 'calculate' })).toBeInTheDocument();
  });

  it('says who the offer is still waiting on, and stops once all three have enrolled', () => {
    expect(card().container.textContent).toContain(labels.waitingFor(['venue', 'host', 'club']));

    const full = card({
      venue_claim: VENUE_CLAIM,
      host_claim: { user_id: 'u-1', host_name: 'Asha', assigned_at: '2026-08-21T10:00:00.000Z' },
      club_claim: {
        club_id: 'c-1',
        club_name: 'Smashers',
        user_id: 'u-2',
        claimed_at: '2026-08-21T11:00:00.000Z',
      },
      stage: 'LIVE',
    });
    expect(full.container.textContent).not.toContain(labels.waitingFor(['venue']));
  });

  // A template cover 404s at request time rather than arriving empty, so the
  // dead URL is caught on its error event, never left as the broken-image glyph.
  it('swaps a cover that fails to load for the placeholder', () => {
    const { container } = card();
    const image = container.querySelector('img');
    expect(image).not.toBeNull();

    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('treats media with no type as a picture, and skips a video', () => {
    expect(
      card({ pod_images_and_videos: [{ url: 'https://cdn.duncit.com/auto/a.jpg' }] }).container.querySelector('img')
    ).not.toBeNull();
    expect(
      card({ pod_images_and_videos: [{ url: 'https://cdn.duncit.com/auto/a.mp4', type: 'VIDEO' }] }).container.querySelector('img')
    ).toBeNull();
  });
});

describe('AutoPodQueue already-enrolled rows', () => {
  it('leaves the enrolled slot empty when the surface passes no renderer for it', async () => {
    const { container } = wrapped(
      <AutoPodQueue
        role="venue"
        rows={[row({ viewer_claimed: true, pod_id: 'pod-9' })]}
        labels={labels}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={() => <button type="button">Enrol</button>}
      />
    );
    await settle();

    expect(container.textContent).toContain('Weekly Badminton');
    expect(screen.queryByText('Open the pod')).not.toBeInTheDocument();
  });
});

describe('AutoPodCategoryFilter', () => {
  const categoriesMock = (
    hostCategories: readonly Record<string, unknown>[] | null,
  ): MockedResponse => ({
    request: { query: MY_HOST_CATEGORIES_FOR_AUTO_POD },
    result: {
      data: {
        myHost: hostCategories
          ? { __typename: 'Host', id: 'host-1', host_categories: hostCategories }
          : null,
      },
    },
  });

  const category = (over: Record<string, unknown> = {}) => ({
    __typename: 'HostCategory',
    sub_category_id: 'sub-1',
    sub_category_name: 'Badminton',
    category_name: 'Racket',
    super_category_name: 'Sports',
    ...over,
  });

  const filter = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) =>
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
        <ThemeProvider theme={testTheme}>
          <AutoPodCategoryFilter value="" onChange={vi.fn()} labels={labels} {...(props as never)} />
        </ThemeProvider>
      </MockedProvider>
    );

  it('offers the host their own approvals, each as its full category path', async () => {
    filter([categoriesMock([category()])]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.categoryLabel));
    await settle();

    expect(screen.getByRole('option', { name: 'Sports › Racket › Badminton' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: labels.allCategories })).toBeInTheDocument();
  });

  it('joins only the levels the row actually carries', async () => {
    filter([categoriesMock([category({ super_category_name: '', category_name: '' })])]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.categoryLabel));
    await settle();

    expect(screen.getByRole('option', { name: 'Badminton' })).toBeInTheDocument();
  });

  it('reports the sub-category the host picked', async () => {
    const onChange = vi.fn();
    filter([categoriesMock([category()])], { onChange });
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(labels.categoryLabel));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: 'Sports › Racket › Badminton' }));
    await settle();

    expect(onChange).toHaveBeenCalledWith('sub-1');
  });

  // A host approved in nothing has nothing to filter by, and is told why rather
  // than being handed an empty dropdown.
  it('locks itself and says so for a host with no approvals at all', async () => {
    filter([categoriesMock([])]);
    await settle();

    expect(screen.getByText(labels.noHostCategories)).toBeInTheDocument();
  });

  it('reads a host row that never answered the same way', async () => {
    filter([categoriesMock(null)]);
    await settle();

    expect(screen.getByText(labels.noHostCategories)).toBeInTheDocument();
  });

  it('drops an approval with no sub-category behind it', async () => {
    filter([categoriesMock([category({ sub_category_id: null })])]);
    await settle();

    expect(screen.getByText(labels.noHostCategories)).toBeInTheDocument();
  });

  it('renders at either size', async () => {
    for (const size of ['small', 'medium'] as const) {
      const { unmount } = filter([categoriesMock([category()])], { size });
      await settle();
      expect(screen.getByLabelText(labels.categoryLabel)).toBeInTheDocument();
      unmount();
    }
  });
});

describe('a virtual offer', () => {
  // No venue to enrol: two ticks, and the card says so in place of a venue line.
  it('draws two ticks and says no venue is needed', () => {
    const { container } = render(
      <AutoPodTicks
        row={{ pod_mode: 'VIRTUAL', venue_claim: null, host_claim: null, club_claim: null }}
        labels={labels}
      />
    );
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(2);

    wrapped(
      <AutoPodCard role="host" row={row({ pod_mode: 'VIRTUAL' })} labels={labels} formatWhen={formatWhen} formatMoney={formatMoney} />
    );
    expect(screen.getByText('mweb.autoPods.virtualPod')).toBeInTheDocument();
  });
});
