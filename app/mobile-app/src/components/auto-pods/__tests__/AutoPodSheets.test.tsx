import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AutoPodWithdrawSheet } from '@/components/auto-pods/AutoPodWithdrawSheet';
import { HostEarningsSheet } from '@/components/auto-pods/HostEarningsSheet';
import { VenueAcceptSheet } from '@/components/auto-pods/VenueAcceptSheet';
import { VenueEarningsSheet } from '@/components/auto-pods/VenueEarningsSheet';
import {
  ClubWithdrawAutoPodDocument,
  HostWithdrawAutoPodDocument,
  VenueWithdrawAutoPodDocument,
} from '@/graphql/auto-pods';
import { useAutoPodPricing } from '@/hooks/useAutoPodPricing';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';
import { graphqlRequest } from '@/services/graphql.client';
import {
  autoPodLocation,
  autoPodTestLabels as labels,
  makeAutoPodRow,
} from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useAutoPodPricing', () => ({ useAutoPodPricing: jest.fn() }));
jest.mock('@/hooks/useVenueAcceptAutoPod', () => ({ useVenueAcceptAutoPod: jest.fn() }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/auto-pods/HostEarningsFields', () => ({
  HostEarningsFields: ({ price }: { price: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="earnings-fields">{`price:${price}`}</Text>;
  },
}));
jest.mock('@/forms/window-offer', () => ({
  WindowOfferForm: (props: {
    title: string;
    subtitle: string;
    busy: boolean;
    error?: string;
    onClose: () => void;
    onSubmit: (offer: unknown) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="window-offer" onPress={() => props.onSubmit({ price: 1 })}>
        <Text testID="window-subtitle">{props.subtitle}</Text>
        <Text testID="window-error">{props.error ?? 'none'}</Text>
        <Text testID="window-busy">{String(props.busy)}</Text>
        <Pressable testID="window-close" onPress={props.onClose} />
      </Pressable>
    );
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const pricing = jest.mocked(useAutoPodPricing);
const acceptHook = jest.mocked(useVenueAcceptAutoPod);
const money = (amount: number) => `₹${amount}`;

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

describe('HostEarningsSheet', () => {
  const priced = (over: Record<string, unknown> = {}) =>
    pricing.mockReturnValue({
      price: '200',
      setPrice: jest.fn(),
      spots: 5,
      setSpots: jest.fn(),
      projection: { host_receives: 450 },
      loading: false,
      failed: false,
      viable: true,
      ...over,
    } as unknown as ReturnType<typeof useAutoPodPricing>);

  const mount = (row = makeAutoPodRow(), onClose = jest.fn(), onEarnings = jest.fn()) => {
    renderWithProviders(
      <HostEarningsSheet
        row={row}
        labels={labels}
        onClose={onClose}
        formatMoney={money}
        onEarnings={onEarnings}
      />,
    );
    return { onClose, onEarnings };
  };

  it('carries the worked-out host earning back to the card while it is open', () => {
    priced();
    const { onEarnings } = mount();
    expect(onEarnings).toHaveBeenLastCalledWith(450);
    expect(screen.getByTestId('earnings-fields')).toHaveTextContent('price:200');
  });

  it('clears the card figure when the numbers do not work', () => {
    priced({ viable: false });
    const { onEarnings } = mount();
    expect(onEarnings).toHaveBeenLastCalledWith(null);
  });

  it('clears the card figure when nothing has been priced yet', () => {
    priced({ projection: null });
    const { onEarnings } = mount();
    expect(onEarnings).toHaveBeenLastCalledWith(null);
  });

  it('reports nothing and shows nothing without an offer', () => {
    priced();
    const onEarnings = jest.fn();
    renderWithProviders(
      <HostEarningsSheet
        row={null}
        labels={labels}
        onClose={jest.fn()}
        formatMoney={money}
        onEarnings={onEarnings}
      />,
    );
    expect(onEarnings).not.toHaveBeenCalled();
    expect(screen.queryByTestId('earnings-fields')).toBeNull();
  });

  it('closes from the footer button', () => {
    priced();
    const { onClose } = mount();
    fireEvent.press(screen.getByTestId('auto-pod-earnings-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('VenueEarningsSheet', () => {
  const venue = (over: Partial<AutoPodVenueOption> = {}): AutoPodVenueOption => ({
    id: 'v1',
    venue_name: 'Court Nine',
    location_id: 'blr',
    city: 'Bengaluru',
    capacity: 0,
    capacity_items: [
      { label: 'Court A', capacity: 6 },
      { label: 'Court B', capacity: 10 },
    ],
    venue_categories: [],
    ...over,
  });

  const mount = (v: AutoPodVenueOption | null, onClose = jest.fn(), onEarnings = jest.fn()) => {
    renderWithProviders(
      <VenueEarningsSheet
        open
        venue={v}
        labels={labels}
        onClose={onClose}
        formatMoney={money}
        onEarnings={onEarnings}
      />,
    );
    return { onClose, onEarnings };
  };

  it('says the venue has no spaces when it publishes no capacity', () => {
    mount(venue({ capacity_items: [], capacity: 0 }));
    expect(screen.getByTestId('auto-pod-no-spaces')).toHaveTextContent(labels.earningsNoSpaces);
  });

  it('says the same when no venue is chosen', () => {
    mount(null);
    expect(screen.getByTestId('auto-pod-no-spaces')).toBeOnTheScreen();
  });

  it('lists each space with its capacity and asks for a price', () => {
    mount(venue());
    expect(screen.getByText(labels.earningsSpacesHint)).toBeOnTheScreen();
    expect(screen.getByText('Court A')).toBeOnTheScreen();
    expect(screen.getByText(labels.earningsSpaceCapacity(10))).toBeOnTheScreen();
    expect(screen.getAllByText(labels.earningsEnterPrice)).toHaveLength(2);
    expect(screen.queryByTestId('auto-pod-space-earning')).toBeNull();
  });

  it('names an unnamed whole-venue space by the whole-venue label', () => {
    mount(venue({ capacity_items: [], capacity: 12 }));
    expect(screen.getByText(labels.earningsWholeVenue)).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-space-price-whole')).toBeOnTheScreen();
  });

  it('spells out price times capacity for a space and keeps digits only', () => {
    mount(venue());
    fireEvent.changeText(screen.getByTestId('auto-pod-space-price-Court A'), '₹2,5x0');
    expect(screen.getByTestId('auto-pod-space-price-Court A').props.value).toBe('250');
    expect(screen.getByTestId('auto-pod-space-earning')).toHaveTextContent(
      labels.earningsFormula('₹250', 6, '₹1500'),
    );
  });

  it('reports the best space on close', () => {
    const { onEarnings, onClose } = mount(venue());
    fireEvent.changeText(screen.getByTestId('auto-pod-space-price-Court A'), '250');
    fireEvent.changeText(screen.getByTestId('auto-pod-space-price-Court B'), '100');
    fireEvent.press(screen.getByTestId('auto-pod-earnings-close'));
    expect(onEarnings).toHaveBeenCalledWith(1500);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports no figure on close when no price was typed', () => {
    const { onEarnings } = mount(venue());
    fireEvent.press(screen.getByTestId('auto-pod-earnings-close'));
    expect(onEarnings).toHaveBeenCalledWith(null);
  });
});

describe('AutoPodWithdrawSheet', () => {
  const mount = (
    role: 'venue' | 'host' | 'club',
    row = makeAutoPodRow({ id: 'ap9', withdraw_penalty_points: 5 }),
  ) => {
    const onClose = jest.fn();
    const onWithdrawn = jest.fn();
    renderWithProviders(
      <AutoPodWithdrawSheet
        row={row}
        role={role}
        labels={labels}
        onClose={onClose}
        onWithdrawn={onWithdrawn}
      />,
    );
    return { onClose, onWithdrawn };
  };

  const confirm = async () =>
    act(async () => {
      fireEvent.press(screen.getByTestId('auto-pod-withdraw-confirm'));
    });

  it('warns about the cost, with the Account Health points when there are any', () => {
    mount('venue');
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-withdraw-warning')).toHaveTextContent(
      labels.withdrawWarning,
    );
    expect(screen.getByTestId('auto-pod-withdraw-penalty')).toHaveTextContent(
      labels.withdrawPenalty(5),
    );
  });

  it('shows no penalty line when withdrawing costs nothing', () => {
    mount('venue', makeAutoPodRow({ withdraw_penalty_points: null }));
    expect(screen.queryByTestId('auto-pod-withdraw-penalty')).toBeNull();
  });

  it('renders nothing for no offer', () => {
    renderWithProviders(
      <AutoPodWithdrawSheet
        row={null}
        role="venue"
        labels={labels}
        onClose={jest.fn()}
        onWithdrawn={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('auto-pod-withdraw-confirm')).toBeNull();
  });

  it.each([
    ['venue', VenueWithdrawAutoPodDocument],
    ['host', HostWithdrawAutoPodDocument],
    ['club', ClubWithdrawAutoPodDocument],
  ] as const)('withdraws a %s with that role mutation and reports it', async (role, document) => {
    request.mockResolvedValue({});
    const { onWithdrawn } = mount(role);
    await confirm();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(document, { auto_pod_doc_id: 'ap9' }, { auth: true });
    expect(onWithdrawn).toHaveBeenCalledTimes(1);
  });

  it('shows the server reason and stays open when the withdrawal is refused', async () => {
    request.mockRejectedValue({ errors: [{ message: 'Too late to withdraw' }] });
    const { onWithdrawn } = mount('host');
    await confirm();
    expect(await screen.findByTestId('auto-pod-withdraw-error')).toBeOnTheScreen();
    expect(onWithdrawn).not.toHaveBeenCalled();
    expect(screen.getByTestId('auto-pod-withdraw-confirm')).toBeEnabled();
  });

  it('falls back to the generic sentence when the failure carries no message', async () => {
    request.mockRejectedValue(undefined);
    mount('host');
    await confirm();
    expect(await screen.findByTestId('auto-pod-withdraw-error')).toHaveTextContent(
      labels.loadFailed,
    );
  });

  it('blocks a second tap while the first is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount('club');
    await confirm();
    expect(screen.getByTestId('auto-pod-withdraw-busy')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-withdraw-confirm')).toBeDisabled();
    await act(async () => finish({}));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('dismisses without withdrawing', () => {
    const { onClose } = mount('venue');
    fireEvent.press(screen.getByTestId('auto-pod-withdraw-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it('clears a stale failure when a different offer is opened', async () => {
    request.mockRejectedValue(new Error('nope'));
    const first = makeAutoPodRow({ id: 'a' });
    const props = { role: 'venue' as const, labels, onClose: jest.fn(), onWithdrawn: jest.fn() };
    const { rerender } = renderWithProviders(<AutoPodWithdrawSheet row={first} {...props} />);
    await confirm();
    expect(await screen.findByTestId('auto-pod-withdraw-error')).toBeOnTheScreen();
    rerender(<AutoPodWithdrawSheet row={makeAutoPodRow({ id: 'b' })} {...props} />);
    await waitFor(() => expect(screen.queryByTestId('auto-pod-withdraw-error')).toBeNull());
  });
});

describe('VenueAcceptSheet', () => {
  const venue: AutoPodVenueOption = {
    id: 'v1',
    venue_name: 'Court Nine',
    location_id: 'blr',
    city: 'Bengaluru',
    capacity: 10,
    capacity_items: [],
    venue_categories: [],
  };
  const hook = (over: Record<string, unknown> = {}) => {
    const accept = jest.fn().mockResolvedValue(undefined);
    acceptHook.mockReturnValue({
      busy: false,
      failure: '',
      priceOf: jest.fn(),
      accept,
      venueInCity: true,
      ...over,
    } as unknown as ReturnType<typeof useVenueAcceptAutoPod>);
    return accept;
  };
  const mount = (row = makeAutoPodRow({ location: autoPodLocation }), v = venue) => {
    const onClose = jest.fn();
    const onAccepted = jest.fn();
    renderWithProviders(
      <VenueAcceptSheet
        row={row}
        venue={v}
        labels={labels}
        onClose={onClose}
        onAccepted={onAccepted}
      />,
    );
    return { onClose, onAccepted };
  };

  it('hands the chosen venue, the offer city and the accept callback to the hook', () => {
    hook();
    const { onAccepted } = mount();
    expect(acceptHook).toHaveBeenCalledWith('ap1', venue, 'blr', labels, onAccepted);
  });

  it('asks the hook about no offer and no city when there is none', () => {
    hook();
    renderWithProviders(
      <VenueAcceptSheet
        row={null}
        venue={null}
        labels={labels}
        onClose={jest.fn()}
        onAccepted={jest.fn()}
      />,
    );
    expect(acceptHook.mock.calls[0]?.slice(0, 3)).toEqual([null, null, null]);
  });

  it('shows the window form for a venue that can serve the offer, with the offer in its subtitle', () => {
    hook({ failure: 'Slot taken', busy: true });
    mount();
    expect(screen.getByTestId('window-subtitle')).toHaveTextContent(
      ['Morning Run', labels.acceptingWith('Court Nine'), 'windowOffer.autoPodHint'].join(' · '),
    );
    expect(screen.getByTestId('window-error')).toHaveTextContent('Slot taken');
    expect(screen.getByTestId('window-busy')).toHaveTextContent('true');
  });

  it('passes no error to the form when there is none', () => {
    hook();
    mount();
    expect(screen.getByTestId('window-error')).toHaveTextContent('none');
  });

  it('accepts with the offer the venue filled in', async () => {
    const accept = hook();
    mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('window-offer'));
    });
    expect(accept).toHaveBeenCalledWith({ price: 1 });
  });

  it('closes from the form', () => {
    hook();
    const { onClose } = mount();
    fireEvent.press(screen.getByTestId('window-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuses a venue outside the city the offer is pinned to, naming the city', () => {
    hook({ venueInCity: false });
    mount();
    expect(screen.queryByTestId('window-offer')).toBeNull();
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-accept-city')).toHaveTextContent(
      labels.pinnedTo('Bengaluru, Karnataka'),
    );
    expect(screen.getByTestId('auto-pod-no-venue-in-city')).toHaveTextContent(
      labels.noVenueInCity('Bengaluru, Karnataka'),
    );
  });

  it('asks the owner to pick a venue first when none is chosen', () => {
    hook({ venueInCity: false });
    renderWithProviders(
      <VenueAcceptSheet
        row={makeAutoPodRow()}
        venue={null}
        labels={labels}
        onClose={jest.fn()}
        onAccepted={jest.fn()}
      />,
    );
    expect(screen.getByTestId('auto-pod-pick-venue-first')).toHaveTextContent(
      labels.pickVenueFirst,
    );
    expect(screen.queryByTestId('auto-pod-accept-city')).toBeNull();
  });

  it('shows nothing of the offer when the dialog has no offer', () => {
    hook({ venueInCity: false });
    renderWithProviders(
      <VenueAcceptSheet
        row={null}
        venue={venue}
        labels={labels}
        onClose={jest.fn()}
        onAccepted={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('auto-pod-accept-sheet')).toBeNull();
  });
});
