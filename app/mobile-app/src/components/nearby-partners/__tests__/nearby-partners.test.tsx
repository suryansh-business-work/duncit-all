import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { NearbyCard } from '@/components/nearby-partners/NearbyCard';
import { NearbyResults } from '@/components/nearby-partners/NearbyResults';
import { NearbySearchBody } from '@/components/nearby-partners/NearbySearchBody';
import { SearchFilters } from '@/components/nearby-partners/SearchFilters';
import type { NearbyItem } from '@/hooks/useNearbyPartners';
import { useNearbySearch, type NearbySearchState } from '@/hooks/useNearbySearch';
import { useLocationStore } from '@/stores/location.store';
import { renderWithProviders } from '@/utils/test-utils';

// The header location chip opens the app's own picker, tested on its own.
jest.mock('@/components/LocationButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { LocationButton: () => <V testID="location-button-stub" /> };
});
jest.mock('@/hooks/useCategoryTree', () => ({
  useCategoryTree: () => ({
    categories: [
      { id: 'sup', name: 'Sports', level: 'SUPER', sort_order: 0 },
      { id: 'c-yoga', name: 'Yoga', level: 'CATEGORY', sort_order: 2 },
      { id: 'c-art', name: 'Art', level: 'CATEGORY', sort_order: 1 },
      { id: 'c-dance', name: 'Dance', level: 'CATEGORY', sort_order: 1 },
      { id: 'sub', name: 'Hatha', level: 'SUB', sort_order: 0 },
    ],
  }),
}));

const host: NearbyItem = {
  id: 'h1',
  kind: 'HOST',
  name: 'Asha',
  imageUrl: '',
  category: 'Yoga · Dance',
  place: '',
  distanceKm: 1.26,
  openStatus: null,
};
const venue: NearbyItem = {
  id: 'v1',
  kind: 'VENUE',
  name: 'Hall',
  imageUrl: '',
  category: 'Sports',
  place: 'Bandra, Mumbai',
  distanceKm: 3,
  openStatus: 'ACCEPTED',
};

/** A real search state (the hook under the screens), exposed so the specs can read it back. */
let latest: NearbySearchState | null = null;
function Harness({
  defaults = [],
  render,
}: Readonly<{ defaults?: string[]; render: (state: NearbySearchState) => React.ReactElement }>) {
  const state = useNearbySearch(defaults);
  latest = state;
  return render(state);
}
const DEFAULTS = ['c-yoga'];

beforeEach(() => {
  latest = null;
  useLocationStore.setState({ selectedId: 'l1', zoneName: 'Andheri', cityLabel: 'Mumbai' });
});

describe('NearbyCard', () => {
  it('shows a host with categories and distance, and asks for a pod', () => {
    const onRequest = jest.fn();
    renderWithProviders(<NearbyCard item={host} disabled={false} onRequest={onRequest} />);
    const card = screen.getByTestId('nearby-card-h1');
    expect(within(card).getByText('Asha')).toBeOnTheScreen();
    expect(within(card).getByText('Yoga · Dance')).toBeOnTheScreen();
    expect(within(card).getByText('1.3 km away')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Request Pod, Asha'));
    expect(onRequest).toHaveBeenCalledWith(host);
  });

  it('shows the live request instead of the button, with the venue’s place', () => {
    renderWithProviders(<NearbyCard item={venue} disabled={false} onRequest={jest.fn()} />);
    expect(screen.getByText('Bandra, Mumbai')).toBeOnTheScreen();
    expect(screen.getByTestId('nearby-card-status-v1')).toHaveTextContent('Accepted');
    expect(screen.queryByTestId('nearby-card-request-v1')).toBeNull();
  });

  it('locks Request Pod when the month’s requests are used up', () => {
    renderWithProviders(
      <NearbyCard item={{ ...host, category: '' }} disabled onRequest={jest.fn()} />,
    );
    expect(screen.getByTestId('nearby-card-request-h1').props['aria-disabled']).toBe(true);
  });
});

describe('SearchFilters', () => {
  it('offers the Category-level chips in admin order, with the defaults on', () => {
    renderWithProviders(
      <Harness defaults={DEFAULTS} render={(s) => <SearchFilters state={s} />} />,
    );
    const chips = within(screen.getByTestId('nearby-search-filters'))
      .getAllByRole('checkbox')
      .map((chip) => chip.props.testID);
    expect(chips).toEqual([
      'nearby-category-all',
      'nearby-category-c-art',
      'nearby-category-c-dance',
      'nearby-category-c-yoga',
    ]);
    expect(screen.getByTestId('nearby-radius-value')).toHaveTextContent('5 km');
    expect(screen.getByTestId('nearby-category-c-yoga').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('nearby-category-all').props['aria-checked']).toBe(false);
  });

  it('toggles categories on and off, and All clears them', () => {
    renderWithProviders(
      <Harness defaults={DEFAULTS} render={(s) => <SearchFilters state={s} />} />,
    );
    fireEvent.press(screen.getByTestId('nearby-category-c-art'));
    expect(latest?.categoryIds).toEqual(['c-yoga', 'c-art']);
    fireEvent.press(screen.getByTestId('nearby-category-c-yoga'));
    expect(latest?.categoryIds).toEqual(['c-art']);
    fireEvent.press(screen.getByTestId('nearby-category-all'));
    expect(latest?.categoryIds).toEqual([]);
    expect(screen.getByTestId('nearby-category-all').props['aria-checked']).toBe(true);
  });

  it('moves the radius with the slider', () => {
    renderWithProviders(<Harness render={(s) => <SearchFilters state={s} />} />);
    const slider = screen.UNSAFE_getByProps({ testID: 'nearby-radius', min: 0 });
    act(() => slider.props.onValueChange([7.5]));
    expect(latest?.radiusKm).toBe(7.5);
    expect(screen.getByTestId('nearby-radius-value')).toHaveTextContent('7.5 km');
    // A malformed event keeps the current radius.
    act(() => slider.props.onValueChange([]));
    expect(latest?.radiusKm).toBe(7.5);
  });
});

describe('NearbyResults', () => {
  const base = {
    items: [],
    loading: false,
    error: null,
    quotaReached: false,
    onRequest: jest.fn(),
  };

  it('asks for a city before anything else', () => {
    useLocationStore.setState({ selectedId: '', zoneName: '', cityLabel: '' });
    renderWithProviders(
      <Harness render={(s) => <NearbyResults kind="HOST" state={s} {...base} loading />} />,
    );
    expect(screen.getByTestId('nearby-pick-location')).toHaveTextContent(
      'Pick your city in the location picker to search nearby.',
    );
  });

  it.each([
    ['HOST', 'Searching Nearby Hosts...'],
    ['VENUE', 'Searching Nearby Venues...'],
  ] as const)('shows the radar while looking for a %s', (kind, title) => {
    renderWithProviders(
      <Harness render={(s) => <NearbyResults kind={kind} state={s} {...base} loading />} />,
    );
    const radar = screen.getByTestId('nearby-searching');
    expect(within(radar).getByText(title)).toBeOnTheScreen();
    expect(within(radar).getByText('Looking within 5 km of Andheri, Mumbai')).toBeOnTheScreen();
  });

  it('shows a failed search', () => {
    renderWithProviders(
      <Harness render={(s) => <NearbyResults kind="HOST" state={s} {...base} error="Down" />} />,
    );
    expect(screen.getByTestId('nearby-error')).toHaveTextContent('Down');
  });

  it('offers a wider radius and all categories when nothing is found', () => {
    renderWithProviders(
      <Harness
        defaults={DEFAULTS}
        render={(s) => <NearbyResults kind="HOST" state={s} {...base} />}
      />,
    );
    expect(screen.getByText('No hosts found within 5 km.')).toBeOnTheScreen();
    expect(screen.getByTestId('nearby-widen')).toHaveTextContent('Search within 10 km');

    fireEvent.press(screen.getByTestId('nearby-all-categories'));
    expect(latest?.categoryIds).toEqual([]);
    expect(screen.queryByTestId('nearby-all-categories')).toBeNull();

    fireEvent.press(screen.getByTestId('nearby-widen'));
    expect(latest?.radiusKm).toBe(10);
    // Already at the widest: no wider offer left.
    expect(screen.getByText('No hosts found within 10 km.')).toBeOnTheScreen();
    expect(screen.queryByTestId('nearby-widen')).toBeNull();
  });

  it('words the empty state for venues', () => {
    renderWithProviders(
      <Harness render={(s) => <NearbyResults kind="VENUE" state={s} {...base} />} />,
    );
    expect(screen.getByText('No venues found within 5 km.')).toBeOnTheScreen();
  });

  it('lists the cards, locked when the quota is reached', () => {
    renderWithProviders(
      <Harness
        render={(s) => (
          <NearbyResults kind="HOST" state={s} {...base} items={[host]} quotaReached />
        )}
      />,
    );
    expect(screen.getByTestId('nearby-results')).toBeOnTheScreen();
    expect(screen.getByTestId('nearby-card-request-h1').props['aria-disabled']).toBe(true);
  });
});

describe('NearbySearchBody', () => {
  const body = (over: Partial<React.ComponentProps<typeof NearbySearchBody>> = {}) => (
    <Harness
      render={(s) => (
        <NearbySearchBody
          kind="HOST"
          state={s}
          items={[host]}
          loading={false}
          error={null}
          quota={{ limit: 10, remaining: 3 }}
          send={jest.fn().mockResolvedValue(undefined)}
          {...over}
        />
      )}
    />
  );

  it('shows where it searches from and what is left this month', () => {
    renderWithProviders(body());
    expect(
      within(screen.getByTestId('nearby-location')).getByText('Andheri, Mumbai'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('nearby-quota')).toHaveTextContent(
      '3 of 10 requests left this month',
    );
  });

  it('says when the month is used up, and asks for a place when none is picked', () => {
    useLocationStore.setState({ selectedId: '', zoneName: '', cityLabel: '' });
    renderWithProviders(body({ quota: { limit: 10, remaining: 0 } }));
    expect(screen.getByTestId('nearby-quota')).toHaveTextContent(
      'You have used all 10 Pod Requests for this month.',
    );
    expect(
      within(screen.getByTestId('nearby-location')).getByText(
        'Pick your city in the location picker to search nearby.',
      ),
    ).toBeOnTheScreen();
  });

  it('hides the quota until it is known', () => {
    renderWithProviders(body({ quota: null }));
    expect(screen.queryByTestId('nearby-quota')).toBeNull();
  });

  it('sends a request with its note, then closes the sheet and confirms', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(body({ send }));
    fireEvent.press(screen.getByTestId('nearby-card-request-h1'));
    expect(screen.getByTestId('request-pod-form')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-note'), 'Saturday morning?');
    fireEvent.press(screen.getByTestId('request-pod-send'));

    await waitFor(() => expect(screen.getByTestId('nearby-sent')).toBeOnTheScreen());
    expect(send).toHaveBeenCalledWith(host, 'Saturday morning?');
    expect(screen.getByTestId('nearby-sent')).toHaveTextContent('Pod Request sent.');
    expect(screen.queryByTestId('request-pod-form')).toBeNull();
  });

  it("keeps the sheet open with the server's refusal", async () => {
    const send = jest.fn().mockRejectedValue(new Error('LIMIT_REACHED: no requests left'));
    renderWithProviders(body({ send }));
    fireEvent.press(screen.getByTestId('nearby-card-request-h1'));
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() =>
      expect(screen.getByTestId('request-pod-error')).toHaveTextContent(
        'LIMIT_REACHED: no requests left',
      ),
    );
    expect(screen.queryByTestId('nearby-sent')).toBeNull();

    // Closing drops the target; opening again starts without the old refusal.
    fireEvent.press(screen.getByTestId('request-pod-sheet-close'));
    expect(screen.queryByTestId('request-pod-form')).toBeNull();
    fireEvent.press(screen.getByTestId('nearby-card-request-h1'));
    expect(screen.queryByTestId('request-pod-error')).toBeNull();
  });

  it('falls back to a generic message for a refusal without one', async () => {
    const send = jest.fn().mockRejectedValue({});
    renderWithProviders(body({ send }));
    fireEvent.press(screen.getByTestId('nearby-card-request-h1'));
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() =>
      expect(screen.getByTestId('request-pod-error')).toHaveTextContent(/Something went wrong/),
    );
  });
});
