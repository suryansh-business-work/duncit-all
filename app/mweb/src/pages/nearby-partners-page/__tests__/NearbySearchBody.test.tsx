import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';

import { AppLocationProvider } from '../../../app/AppLocationContext';
import { OPEN_LOCATION_PICKER_EVENT } from '../../../components/app-header/queries';
import { interpolatedCopy } from '../../pod-requests/__tests__/interpolatedCopy';
import type { NearbyItem } from '../NearbyCard';
import NearbySearchBody from '../NearbySearchBody';
import { SEARCH_CATEGORIES, type PodRequestQuota } from '../queries';
import { useNearbySearch } from '../useNearbySearch';

// The city's name comes from a shared locations lookup with its own suite.
vi.mock('../../../hooks/useAutoPodCityLabel', () => ({
  useAutoPodCityLabel: (id: string) => (id === 'loc-lko' ? 'Lucknow' : undefined),
}));

const categoriesMock: MockedResponse = {
  request: { query: SEARCH_CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'cat-sports', name: 'Sports', is_active: true },
        { __typename: 'Category', id: 'cat-music', name: 'Music', is_active: true },
        { __typename: 'Category', id: 'cat-old', name: 'Retired', is_active: false },
      ],
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const host = (over: Partial<NearbyItem> = {}): NearbyItem => ({
  id: 'host-1',
  kind: 'HOST',
  name: 'Asha',
  imageUrl: '',
  category: 'Running · Cycling',
  place: '',
  distanceKm: 1.26,
  openStatus: null,
  ...over,
});

interface Setup {
  kind?: 'HOST' | 'VENUE';
  items?: NearbyItem[];
  loading?: boolean;
  error?: string | null;
  quota?: PodRequestQuota | null;
  send?: (item: NearbyItem, note: string) => Promise<unknown>;
  defaults?: string[];
  locationId?: string;
  zoneName?: string;
}

/** The real search state, so the filters and the empty-state buttons move the search the page sends. */
function Harness({ kind = 'HOST', items = [], loading = false, error = null, quota = null, send, defaults = [] }: Setup) {
  const state = useNearbySearch(defaults);
  return (
    <>
      <NearbySearchBody
        kind={kind}
        state={state}
        items={items}
        loading={loading}
        error={error}
        quota={quota}
        sending={false}
        send={send ?? (async () => undefined)}
      />
      <output data-testid="search">{JSON.stringify(state.search)}</output>
    </>
  );
}

function renderBody(setup: Setup = {}) {
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[categoriesMock]}>
      <AppLocationProvider locationId={setup.locationId ?? 'loc-lko'} zoneName={setup.zoneName ?? 'Gomti Nagar'}>
        <Harness {...setup} />
      </AppLocationProvider>
    </MockedProvider>,
  );
}

const search = () => JSON.parse(screen.getByTestId('search').textContent ?? '{}');

let notices: string[] = [];
const onNotify = (event: Event) => notices.push((event as CustomEvent<{ message: string }>).detail.message);
beforeEach(() => {
  notices = [];
  globalThis.addEventListener('duncit:notify', onNotify);
});
afterEach(() => globalThis.removeEventListener('duncit:notify', onNotify));

describe('NearbySearchBody — where and what', () => {
  it("asks for a city when the header has none, and the location bar opens the header's picker", () => {
    const opened = vi.fn();
    globalThis.addEventListener(OPEN_LOCATION_PICKER_EVENT, opened);
    renderBody({ locationId: '', zoneName: '' });

    expect(screen.getByTestId('nearby-pick-location')).toHaveTextContent(
      'Pick your city in the location picker to search nearby.',
    );
    expect(screen.getByTestId('nearby-location')).toHaveTextContent('Pick your city in the location picker');
    fireEvent.click(screen.getByTestId('nearby-location'));
    expect(opened).toHaveBeenCalledTimes(1);
    globalThis.removeEventListener(OPEN_LOCATION_PICKER_EVENT, opened);
  });

  it('names the area and city it searches around', () => {
    renderBody();

    expect(screen.getByTestId('nearby-location')).toHaveTextContent('Gomti Nagar, Lucknow');
  });

  it('shows the radar while searching, naming the radius and the place', () => {
    renderBody({ loading: true });

    const radar = screen.getByTestId('nearby-searching');
    expect(radar).toHaveTextContent('Searching Nearby Hosts...');
    expect(within(radar).getByText(/Gomti Nagar, Lucknow/)).toBeInTheDocument();
    expect(screen.queryByTestId('nearby-results')).not.toBeInTheDocument();
  });

  it('words the radar for venues on the venue search', () => {
    renderBody({ kind: 'VENUE', loading: true });

    expect(screen.getByTestId('nearby-searching')).toHaveTextContent('Searching Nearby Venues...');
  });

  it('shows a failed search as an error', () => {
    renderBody({ error: 'Search is unavailable' });

    expect(screen.getByText('Search is unavailable')).toBeInTheDocument();
  });

  it('starts the category filter at the defaults; a chip toggles on and off and All categories clears it', async () => {
    renderBody({ defaults: ['cat-sports'] });

    const music = await screen.findByTestId('nearby-category-cat-music');
    expect(screen.queryByTestId('nearby-category-cat-old')).not.toBeInTheDocument();
    expect(screen.getByTestId('nearby-category-cat-sports')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('nearby-category-all')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(music);
    expect(search().category_ids).toEqual(['cat-sports', 'cat-music']);

    fireEvent.click(screen.getByTestId('nearby-category-cat-sports'));
    expect(search().category_ids).toEqual(['cat-music']);

    fireEvent.click(screen.getByTestId('nearby-category-all'));
    expect(search().category_ids).toEqual([]);
    expect(screen.getByTestId('nearby-category-all')).toHaveAttribute('aria-pressed', 'true');
  });

  it('re-runs the search at the radius the slider is let go at', () => {
    renderBody();
    const slider = within(screen.getByTestId('nearby-radius')).getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemax', '10');
    expect(search().radius_km).toBe(5);

    fireEvent.change(slider, { target: { value: 7.5 } });

    expect(search().radius_km).toBe(7.5);
  });
});

describe('NearbySearchBody — results', () => {
  it('offers a wider radius and all categories when nothing is found', () => {
    renderBody({ defaults: ['cat-sports'] });

    const empty = screen.getByTestId('nearby-empty');
    expect(within(empty).getByText(interpolatedCopy('No hosts found within', 5, 'km.'))).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nearby-widen'));
    expect(search().radius_km).toBe(10);
    // Already at the widest: no more widening to offer.
    expect(screen.queryByTestId('nearby-widen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nearby-all-categories'));
    expect(search().category_ids).toEqual([]);
    expect(screen.queryByTestId('nearby-all-categories')).not.toBeInTheDocument();
  });

  it('words the empty state for venues, and offers no category reset when none is set', () => {
    renderBody({ kind: 'VENUE' });

    expect(screen.getByText(interpolatedCopy('No venues found within', 5, 'km.'))).toBeInTheDocument();
    expect(screen.queryByTestId('nearby-all-categories')).not.toBeInTheDocument();
  });

  it('draws each result with its distance, and a status chip instead of Request Pod when a request is live', () => {
    renderBody({
      items: [
        host(),
        host({ id: 'v-1', kind: 'VENUE', name: 'Gomti Arena', category: 'Sports', place: 'Gomti Nagar, Lucknow', openStatus: 'ACCEPTED' }),
      ],
    });

    const asha = screen.getByTestId('nearby-card-host-1');
    expect(within(asha).getByText('Asha')).toBeInTheDocument();
    expect(within(asha).getByText('Running · Cycling')).toBeInTheDocument();
    expect(within(asha).getByText(interpolatedCopy('', '1.3', 'km away'))).toBeInTheDocument();
    expect(screen.getByTestId('nearby-card-request-host-1')).toBeEnabled();

    const arena = screen.getByTestId('nearby-card-v-1');
    expect(within(arena).getByText('Gomti Nagar, Lucknow')).toBeInTheDocument();
    expect(screen.getByTestId('nearby-card-status-v-1')).toHaveTextContent('Accepted');
    expect(screen.queryByTestId('nearby-card-request-v-1')).not.toBeInTheDocument();
  });

  it("shows what is left of this month's requests", () => {
    renderBody({ items: [host()], quota: { limit: 10, remaining: 3 } });

    expect(screen.getByTestId('nearby-quota')).toHaveTextContent(/3\W*of\W*10\W*requests left this month/);
    expect(screen.getByTestId('nearby-card-request-host-1')).toBeEnabled();
  });

  it('turns Request Pod off once the month is used up', () => {
    renderBody({ items: [host()], quota: { limit: 10, remaining: 0 } });

    expect(screen.getByTestId('nearby-quota')).toHaveTextContent(/You have used all\W*10\W*Pod Requests for this month\./);
    expect(screen.getByTestId('nearby-card-request-host-1')).toBeDisabled();
  });
});

describe('NearbySearchBody — Request Pod', () => {
  const openDialog = () => {
    fireEvent.click(screen.getByTestId('nearby-card-request-host-1'));
    return screen.getByTestId('request-pod-form');
  };

  it('sends the request with the note, says so, and closes', async () => {
    const send = vi.fn(async () => ({ id: 'req-1' }));
    renderBody({ items: [host()], send });

    const form = openDialog();
    expect(within(form).getByText('Asha')).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText('Note (optional)'), { target: { value: 'Sunday run?' } });
    fireEvent.click(screen.getByTestId('request-pod-send'));

    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-1' }), 'Sunday run?'));
    await waitFor(() => expect(screen.queryByTestId('request-pod-form')).not.toBeInTheDocument());
    expect(notices).toEqual(['Pod Request sent.']);
  });

  it('sends an empty note as empty', async () => {
    const send = vi.fn(async () => ({ id: 'req-1' }));
    renderBody({ items: [host()], send });

    openDialog();
    fireEvent.click(screen.getByTestId('request-pod-send'));

    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-1' }), ''));
  });

  it('refuses a note over 500 characters without sending', async () => {
    const send = vi.fn(async () => ({ id: 'req-1' }));
    renderBody({ items: [host()], send });

    const form = openDialog();
    fireEvent.change(within(form).getByLabelText('Note (optional)'), { target: { value: 'x'.repeat(501) } });
    fireEvent.click(screen.getByTestId('request-pod-send'));

    expect(await within(form).findByText(interpolatedCopy('Keep the note under', 500, 'characters.'))).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ['LIMIT_REACHED', 'You have used all 10 Pod Requests for this month.'],
    ['CONFLICT', 'There is already an open request between you.'],
  ])("keeps the dialog open with the server's %s refusal", async (code, message) => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error('refused'), { errors: [new GraphQLError(message, { extensions: { code } })] });
    });
    renderBody({ items: [host()], send });

    openDialog();
    fireEvent.click(screen.getByTestId('request-pod-send'));

    expect(await screen.findByTestId('request-pod-error')).toHaveTextContent(message);
    expect(screen.getByTestId('request-pod-form')).toBeInTheDocument();
    expect(notices).toEqual([]);
  });

  it('clears the last refusal when the dialog is opened again, and closing sends nothing', async () => {
    const send = vi.fn(async () => {
      throw new Error('Request timed out');
    });
    renderBody({ items: [host()], send });

    openDialog();
    fireEvent.click(screen.getByTestId('request-pod-send'));
    await screen.findByTestId('request-pod-error');

    fireEvent.click(screen.getByTestId('request-pod-dialog-close'));
    await waitFor(() => expect(screen.queryByTestId('request-pod-form')).not.toBeInTheDocument());
    openDialog();

    expect(screen.queryByTestId('request-pod-error')).not.toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
