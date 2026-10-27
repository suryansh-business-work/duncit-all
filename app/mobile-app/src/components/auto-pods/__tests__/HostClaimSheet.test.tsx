import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { HostClaimSheet } from '@/components/auto-pods/HostClaimSheet';
import { claimReady } from '@/components/auto-pods/HostClaimSheet/claimReady';
import { HostClaimFooter } from '@/components/auto-pods/HostClaimSheet/HostClaimFooter';
import { HostClaimNotices } from '@/components/auto-pods/HostClaimSheet/HostClaimNotices';
import { HostClaimSummary } from '@/components/auto-pods/HostClaimSheet/HostClaimSummary';
import { HostAssignAutoPodDocument } from '@/graphql/auto-pods';
import { useAutoPodPricing } from '@/hooks/useAutoPodPricing';
import { graphqlRequest } from '@/services/graphql.client';
import {
  autoPodLocation,
  autoPodTestLabels as labels,
  makeAutoPodRow,
  venueClaim,
} from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useAutoPodPricing', () => ({ useAutoPodPricing: jest.fn() }));
jest.mock('@/components/auto-pods/HostEarningsFields', () => ({
  HostEarningsFields: () => null,
}));
jest.mock('@/components/auto-pods/HostMeetingFields', () => ({
  ...jest.requireActual('@/components/auto-pods/HostMeetingFields'),
  HostMeetingFields: ({ onChange }: { onChange: (next: unknown) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    return (
      <Pressable
        testID="meeting-fill"
        onPress={() =>
          onChange({
            meeting_platform: 'ZOOM',
            meeting_url: 'https://zoom.us/j/1',
            pod_date_time: new Date(Date.now() + 3_600_000),
            pod_end_date_time: new Date(Date.now() + 7_200_000),
          })
        }
      />
    );
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const pricing = jest.mocked(useAutoPodPricing);
const money = (amount: number) => `₹${amount}`;
const when = (iso: string) => `when:${iso}`;

const projection = { viable: true, min_spots: 2, max_spots: 10 };

const priced = (over: Record<string, unknown> = {}) =>
  pricing.mockReturnValue({
    price: '200',
    setPrice: jest.fn(),
    amount: 200,
    spots: 5,
    setSpots: jest.fn(),
    projection,
    loading: false,
    failed: false,
    inRange: true,
    viable: true,
    ...over,
  } as unknown as ReturnType<typeof useAutoPodPricing>);

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

describe('claimReady', () => {
  const ok = {
    autoPodId: 'ap1',
    needsLocation: false,
    projection: { viable: true } as never,
    inRange: true,
    meetingReady: true,
  };

  it('is ready when everything holds', () => {
    expect(claimReady(ok)).toBe(true);
  });

  it.each([
    ['no offer', { autoPodId: null }],
    ['a city still to pick', { needsLocation: true }],
    ['an incomplete meeting', { meetingReady: false }],
    ['no projection yet', { projection: null }],
    ['numbers the server says are not viable', { projection: { viable: false } as never }],
    ['spots outside the range', { inRange: false }],
  ])('is not ready with %s', (_name, over) => {
    expect(claimReady({ ...ok, ...over })).toBe(false);
  });
});

describe('HostClaimFooter', () => {
  it('dismisses and assigns, and greys the assign button when disabled', () => {
    const onClose = jest.fn();
    const onAssign = jest.fn();
    renderWithProviders(
      <HostClaimFooter labels={labels} disabled={false} onClose={onClose} onAssign={onAssign} />,
    );
    fireEvent.press(screen.getByTestId('auto-pod-assign-cancel'));
    fireEvent.press(screen.getByTestId('auto-pod-assign-confirm'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it('does not assign while disabled', () => {
    const onAssign = jest.fn();
    renderWithProviders(
      <HostClaimFooter labels={labels} disabled onClose={jest.fn()} onAssign={onAssign} />,
    );
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
  });
});

describe('HostClaimNotices', () => {
  const mount = (over: Partial<React.ComponentProps<typeof HostClaimNotices>> = {}) =>
    renderWithProviders(
      <HostClaimNotices
        labels={labels}
        warning="#aa0000"
        needsLocation={false}
        pinsCity={false}
        locationId=""
        busy={false}
        failure=""
        {...over}
      />,
    );

  it('shows nothing when there is nothing to say', () => {
    mount();
    expect(screen.queryByTestId('auto-pod-assign-needs-location')).toBeNull();
    expect(screen.queryByTestId('auto-pod-assign-will-pin')).toBeNull();
    expect(screen.queryByTestId('auto-pod-assign-busy')).toBeNull();
    expect(screen.queryByTestId('auto-pod-assign-error')).toBeNull();
  });

  it('asks for a city first', () => {
    mount({ needsLocation: true });
    expect(screen.getByTestId('auto-pod-assign-needs-location')).toHaveTextContent(
      labels.pickLocationFirst,
    );
  });

  it('names the city the claim will pin, falling back to its id', () => {
    mount({ pinsCity: true, locationId: 'blr', locationLabel: 'Bengaluru' });
    expect(screen.getByTestId('auto-pod-assign-will-pin')).toHaveTextContent(
      labels.willPinTo('Bengaluru'),
    );
  });

  it('falls back to the location id when the city has no display name', () => {
    mount({ pinsCity: true, locationId: 'blr' });
    expect(screen.getByTestId('auto-pod-assign-will-pin')).toHaveTextContent(
      labels.willPinTo('blr'),
    );
  });

  it('shows the spinner while busy and the failure when the claim failed', () => {
    mount({ busy: true, failure: 'Someone beat you to it' });
    expect(screen.getByTestId('auto-pod-assign-busy')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-assign-error')).toHaveTextContent('Someone beat you to it');
  });
});

describe('HostClaimSummary', () => {
  it('shows the title, the pinned city and the venue slot', () => {
    renderWithProviders(
      <HostClaimSummary
        row={makeAutoPodRow({ venue_claim: venueClaim })}
        pinned={autoPodLocation}
        labels={labels}
        formatWhen={when}
      />,
    );
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-assign-city')).toHaveTextContent(
      labels.pinnedTo('Bengaluru, Karnataka'),
    );
    expect(screen.getByText(`Court Nine · when:${venueClaim.pod_date_time}`)).toBeOnTheScreen();
  });

  it('shows only the title for an offer with no city and no venue yet', () => {
    renderWithProviders(
      <HostClaimSummary row={makeAutoPodRow()} pinned={null} labels={labels} formatWhen={when} />,
    );
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-pod-assign-city')).toBeNull();
    expect(screen.queryByText(/Court Nine/)).toBeNull();
  });

  it('shows nothing without an offer', () => {
    renderWithProviders(
      <HostClaimSummary row={null} pinned={null} labels={labels} formatWhen={when} />,
    );
    expect(screen.queryByText('Morning Run')).toBeNull();
  });
});

describe('HostClaimSheet', () => {
  const mount = (
    row = makeAutoPodRow({ location: autoPodLocation }),
    over: { locationId?: string; locationLabel?: string } = {},
  ) => {
    const onClose = jest.fn();
    const onAssigned = jest.fn();
    renderWithProviders(
      <HostClaimSheet
        row={row}
        labels={labels}
        onClose={onClose}
        onAssigned={onAssigned}
        formatWhen={when}
        formatMoney={money}
        locationId={over.locationId ?? ''}
        locationLabel={over.locationLabel}
      />,
    );
    return { onClose, onAssigned };
  };
  const assign = async () =>
    act(async () => {
      fireEvent.press(screen.getByTestId('auto-pod-assign-confirm'));
    });

  it('assigns a pinned physical offer without a city or a meeting', async () => {
    priced();
    request.mockResolvedValue({});
    const { onAssigned } = mount();
    await assign();
    expect(request).toHaveBeenCalledWith(
      HostAssignAutoPodDocument,
      { auto_pod_doc_id: 'ap1', location_id: null, pod_amount: 200, no_of_spots: 5 },
      { auth: true },
    );
    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('takes the host city for an unpinned offer and says so', async () => {
    priced();
    request.mockResolvedValue({});
    mount(makeAutoPodRow(), { locationId: 'blr', locationLabel: 'Bengaluru' });
    expect(screen.getByTestId('auto-pod-assign-will-pin')).toHaveTextContent(
      labels.willPinTo('Bengaluru'),
    );
    await assign();
    expect(request.mock.calls[0]?.[1]).toMatchObject({ location_id: 'blr' });
  });

  it('keeps assign off, and says why, when an unpinned offer has no city', async () => {
    priced();
    mount(makeAutoPodRow(), { locationId: '' });
    expect(screen.getByTestId('auto-pod-assign-needs-location')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
    await userEvent.setup().press(screen.getByTestId('auto-pod-assign-confirm'));
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps assign off while the server has not priced the numbers as viable', () => {
    priced({ projection: { ...projection, viable: false } });
    mount();
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
  });

  it('keeps assign off for spots outside the venue range', () => {
    priced({ inRange: false });
    mount();
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
  });

  it('asks a virtual offer for its meeting before assign is allowed, then sends it', async () => {
    priced();
    request.mockResolvedValue({});
    mount(makeAutoPodRow({ pod_mode: 'VIRTUAL', location: autoPodLocation }));
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
    fireEvent.press(screen.getByTestId('meeting-fill'));
    await waitFor(() => expect(screen.getByTestId('auto-pod-assign-confirm')).toBeEnabled());
    await assign();
    expect(request.mock.calls[0]?.[1]).toMatchObject({
      meeting: { meeting_platform: 'ZOOM', meeting_url: 'https://zoom.us/j/1' },
    });
  });

  it('does not ask a physical offer for a meeting', () => {
    priced();
    mount();
    expect(screen.queryByTestId('meeting-fill')).toBeNull();
  });

  it('shows the server reason when another host got there first, and stays open', async () => {
    priced();
    request.mockRejectedValue({ errors: [{ message: 'Already assigned' }] });
    const { onAssigned } = mount();
    await assign();
    expect(await screen.findByTestId('auto-pod-assign-error')).toBeOnTheScreen();
    expect(onAssigned).not.toHaveBeenCalled();
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeEnabled();
  });

  it('falls back to the claimed-elsewhere sentence when the failure carries no message', async () => {
    priced();
    request.mockRejectedValue(undefined);
    mount();
    await assign();
    expect(await screen.findByTestId('auto-pod-assign-error')).toHaveTextContent(
      labels.claimedElsewhere,
    );
  });

  it('blocks a second tap while the first is in flight', async () => {
    priced();
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount();
    await assign();
    expect(screen.getByTestId('auto-pod-assign-busy')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-assign-confirm')).toBeDisabled();
    await act(async () => finish({}));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('dismisses without assigning', () => {
    priced();
    const { onClose } = mount();
    fireEvent.press(screen.getByTestId('auto-pod-assign-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it('shows nothing for no offer', () => {
    priced({ projection: null });
    renderWithProviders(
      <HostClaimSheet
        row={null}
        labels={labels}
        onClose={jest.fn()}
        onAssigned={jest.fn()}
        formatWhen={when}
        formatMoney={money}
        locationId=""
      />,
    );
    expect(screen.queryByTestId('auto-pod-assign-confirm')).toBeNull();
  });

  it('clears a stale failure when a different offer is opened', async () => {
    priced();
    request.mockRejectedValue(new Error('nope'));
    const props = {
      labels,
      onClose: jest.fn(),
      onAssigned: jest.fn(),
      formatWhen: when,
      formatMoney: money,
      locationId: '',
    };
    const first = makeAutoPodRow({ id: 'a', location: autoPodLocation });
    const { rerender } = renderWithProviders(<HostClaimSheet row={first} {...props} />);
    await assign();
    expect(await screen.findByTestId('auto-pod-assign-error')).toBeOnTheScreen();
    rerender(
      <HostClaimSheet row={makeAutoPodRow({ id: 'b', location: autoPodLocation })} {...props} />,
    );
    await waitFor(() => expect(screen.queryByTestId('auto-pod-assign-error')).toBeNull());
  });
});
