import { Image } from 'react-native';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { Text } from 'tamagui';
import { autoPodCityLabel, autoPodMissingRoles } from '@duncit/utils';

import { AutoPodCard } from '@/components/auto-pods/AutoPodCard';
import {
  AutoPodCover,
  DetailLine,
  FactChip,
  ModeTag,
} from '@/components/auto-pods/AutoPodCard/AutoPodCardParts';
import {
  AutoPodEarningsButton,
  autoPodEarningsRenderer,
} from '@/components/auto-pods/AutoPodEarningsButton';
import { AutoPodExpiryNote } from '@/components/auto-pods/AutoPodExpiryNote';
import { AutoPodTicksRow } from '@/components/auto-pods/AutoPodTicksRow';
import {
  autoPodLocation,
  autoPodTestLabels as labels,
  clubClaim,
  hostClaim,
  makeAutoPodRow,
  venueClaim,
} from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

let mockNow = new Date('2030-01-01T10:00:00.000Z').getTime();
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ clock: { nowMs: () => mockNow } }),
}));

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

describe('AutoPodTicksRow', () => {
  it('shows the three enrolments in order, all pending for a fresh offer', () => {
    renderWithProviders(<AutoPodTicksRow row={makeAutoPodRow()} labels={labels} />);
    const roles = screen.getAllByTestId(/^auto-pod-tick-/).map((node) => node.props.testID);
    expect(roles).toEqual(['auto-pod-tick-venue', 'auto-pod-tick-host', 'auto-pod-tick-club']);
    expect(screen.getByTestId('auto-pod-tick-venue').props['aria-label']).toBe(
      `${labels.tick('venue')} — ${labels.tickPending}`,
    );
  });

  it('turns a tick done the moment that partner has enrolled', () => {
    renderWithProviders(
      <AutoPodTicksRow
        row={makeAutoPodRow({ venue_claim: venueClaim, club_claim: clubClaim })}
        labels={labels}
      />,
    );
    expect(screen.getByTestId('auto-pod-tick-venue').props['aria-label']).toBe(
      `${labels.tick('venue')} — ${labels.tickDone}`,
    );
    expect(screen.getByTestId('auto-pod-tick-host').props['aria-label']).toBe(
      `${labels.tick('host')} — ${labels.tickPending}`,
    );
    expect(screen.getByTestId('auto-pod-tick-club').props['aria-label']).toBe(
      `${labels.tick('club')} — ${labels.tickDone}`,
    );
  });

  it('shows only two ticks for a virtual offer, which has no venue', () => {
    renderWithProviders(
      <AutoPodTicksRow row={makeAutoPodRow({ pod_mode: 'VIRTUAL' })} labels={labels} />,
    );
    expect(screen.queryByTestId('auto-pod-tick-venue')).toBeNull();
    expect(screen.getAllByTestId(/^auto-pod-tick-/)).toHaveLength(2);
  });
});

describe('AutoPodExpiryNote', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNow = new Date('2030-01-01T10:00:00.000Z').getTime();
  });
  afterEach(() => jest.useRealTimers());

  it('draws nothing without a deadline', () => {
    renderWithProviders(<AutoPodExpiryNote expiresAt={null} labels={labels} />);
    expect(screen.queryByTestId('auto-pod-expiry')).toBeNull();
  });

  it('draws nothing once the deadline has passed', () => {
    renderWithProviders(<AutoPodExpiryNote expiresAt="2030-01-01T09:00:00.000Z" labels={labels} />);
    expect(screen.queryByTestId('auto-pod-expiry')).toBeNull();
  });

  it('counts down to the deadline, ticking each second off the admin clock', () => {
    renderWithProviders(<AutoPodExpiryNote expiresAt="2030-01-01T15:12:30.000Z" labels={labels} />);
    expect(screen.getByText(labels.expiresIn(5, 12, 30))).toBeOnTheScreen();
    mockNow += 1000;
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(labels.expiresIn(5, 12, 29))).toBeOnTheScreen();
  });

  it('stops counting when it goes away, and does not start without a deadline', () => {
    const { unmount } = renderWithProviders(
      <AutoPodExpiryNote expiresAt="2030-01-01T15:12:30.000Z" labels={labels} />,
    );
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    renderWithProviders(<AutoPodExpiryNote expiresAt={undefined} labels={labels} />);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('AutoPodEarningsButton', () => {
  it('opens the calculator when pressed', () => {
    const onPress = jest.fn();
    renderWithProviders(<AutoPodEarningsButton labels={labels} onPress={onPress} testID="earn" />);
    fireEvent.press(screen.getByTestId('earn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('earn').props['aria-label']).toBe(labels.viewEarningsCta);
  });

  it('draws the same control for any row, opening the calculator for that row', () => {
    const open = jest.fn();
    const render = autoPodEarningsRenderer(labels, open);
    const row = makeAutoPodRow({ id: 'ap7' });
    renderWithProviders(<>{render(row)}</>);
    fireEvent.press(screen.getByTestId('auto-pod-view-earnings-ap7'));
    expect(open).toHaveBeenCalledWith(row);
  });
});

describe('AutoPodCardParts', () => {
  it('shows a detail line with its text', () => {
    renderWithProviders(<DetailLine icon="place" value="Court Nine" tint="#000" />);
    expect(screen.getByText('Court Nine')).toBeOnTheScreen();
  });

  it('tags a card physical or virtual', () => {
    const { unmount } = renderWithProviders(<ModeTag virtual={false} label="In person" />);
    expect(screen.getByText('In person')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByProps({ name: 'place' })).toBeTruthy();
    unmount();
    renderWithProviders(<ModeTag virtual label="Online" />);
    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByProps({ name: 'videocam' })).toBeTruthy();
  });

  it('shows a fact chip', () => {
    renderWithProviders(<FactChip text="Spots: 10" />);
    expect(screen.getByText('Spots: 10')).toBeOnTheScreen();
  });

  it('shows the cover image, and a placeholder once the image fails to load', () => {
    renderWithProviders(<AutoPodCover url="https://cdn/cover.jpg" />);
    const [image] = screen.UNSAFE_getAllByType(Image);
    expect(image?.props.source).toEqual({ uri: 'https://cdn/cover.jpg' });
    act(() => image?.props.onError());
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    expect(screen.UNSAFE_getByProps({ name: 'broken-image' })).toBeTruthy();
  });
});

describe('AutoPodCard', () => {
  const mount = (
    row = makeAutoPodRow(),
    extra: Partial<React.ComponentProps<typeof AutoPodCard>> = {},
  ) =>
    renderWithProviders(
      <AutoPodCard
        row={row}
        role="host"
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        {...extra}
      />,
    );

  it('shows the title, number, ticks, an unpinned city and the price and spots', () => {
    mount();
    expect(screen.getByTestId('auto-pod-card-ap1')).toBeOnTheScreen();
    expect(screen.getByText('Morning Run')).toBeOnTheScreen();
    expect(screen.getByText('AP-1')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-tick-venue')).toBeOnTheScreen();
    expect(screen.getByText(labels.unpinned)).toBeOnTheScreen();
    expect(screen.getByText(`${labels.priceLabel}: ₹200`)).toBeOnTheScreen();
    expect(screen.getByText(`${labels.spotsLabel}: 10`)).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-mode-tag')).toHaveTextContent(
      new RegExp(labels.modePhysical),
    );
  });

  it('adds the category to the number when there is one', () => {
    mount(makeAutoPodRow({ category_name: 'Running' }));
    expect(screen.getByText('AP-1 · Running')).toBeOnTheScreen();
  });

  it('shows the city the offer is pinned to', () => {
    mount(makeAutoPodRow({ location: autoPodLocation }));
    expect(screen.getByText(labels.pinnedTo(autoPodCityLabel(autoPodLocation)))).toBeOnTheScreen();
  });

  it('shows the venue and the slot window once a venue has enrolled', () => {
    mount(makeAutoPodRow({ venue_claim: venueClaim }));
    expect(screen.getByText('Court Nine')).toBeOnTheScreen();
    expect(screen.getByText(`when:${venueClaim.pod_date_time}`)).toBeOnTheScreen();
  });

  it('shows no venue lines before a venue has enrolled', () => {
    mount();
    expect(screen.queryByText('Court Nine')).toBeNull();
  });

  it('marks a virtual offer', () => {
    mount(makeAutoPodRow({ pod_mode: 'VIRTUAL' }));
    expect(screen.getByTestId('auto-pod-mode-tag')).toHaveTextContent(
      new RegExp(labels.modeVirtual),
    );
    expect(screen.getByText(labels.virtualPod)).toBeOnTheScreen();
  });

  it('says who will price a template that carries no price, and shows no price chips', () => {
    mount(makeAutoPodRow({ pod_amount: 0, no_of_spots: 0 }));
    expect(screen.getByTestId('auto-pod-priced-by-host')).toHaveTextContent(labels.pricedByHost);
    expect(screen.queryByText(`${labels.priceLabel}: ₹0`)).toBeNull();
  });

  it('shows the cover when the offer has an image, and no cover without one', () => {
    const { unmount } = mount(
      makeAutoPodRow({ pod_images_and_videos: [{ url: 'https://cdn/a.jpg', type: 'IMAGE' }] }),
    );
    expect(screen.UNSAFE_getAllByType(Image).map((image) => image.props.source)).toEqual([
      { uri: 'https://cdn/a.jpg' },
    ]);
    unmount();
    mount();
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });

  it('reads the role own earnings, and says so plainly when it is not known yet', () => {
    mount(makeAutoPodRow({ expected_host_earnings: 1500 }));
    expect(screen.getByTestId('auto-pod-earnings')).toHaveTextContent(
      labels.expectedEarnings('₹1500'),
    );
  });

  it('says earnings are unknown until the viewer has worked them out', () => {
    mount();
    expect(screen.getByTestId('auto-pod-earnings')).toHaveTextContent(labels.earningsUnknown);
  });

  it('prefers the figure the viewer worked out themselves', () => {
    mount(makeAutoPodRow({ expected_host_earnings: 1500 }), { earnings: 900 });
    expect(screen.getByTestId('auto-pod-earnings')).toHaveTextContent(
      labels.expectedEarnings('₹900'),
    );
  });

  it('says who the offer is still waiting for, and nothing once everyone has enrolled', () => {
    const row = makeAutoPodRow({ venue_claim: venueClaim });
    const { unmount } = mount(row);
    expect(screen.getByText(labels.waitingFor(autoPodMissingRoles(row)))).toBeOnTheScreen();
    unmount();
    mount(
      makeAutoPodRow({ venue_claim: venueClaim, host_claim: hostClaim, club_claim: clubClaim }),
    );
    expect(screen.queryByText(/waitingFor/)).toBeNull();
  });

  it('draws the role button and the earnings control the caller gave it', () => {
    mount(makeAutoPodRow(), {
      action: <Text testID="the-action">act</Text>,
      earningsAction: <Text testID="the-earnings">earn</Text>,
    });
    expect(screen.getByTestId('the-action')).toBeOnTheScreen();
    expect(screen.getByTestId('the-earnings')).toBeOnTheScreen();
  });

  it('counts down to the release of the offer', () => {
    mockNow = new Date('2030-01-01T10:00:00.000Z').getTime();
    mount(makeAutoPodRow({ expires_at: '2030-01-01T12:00:00.000Z' }));
    expect(screen.getByTestId('auto-pod-expiry')).toBeOnTheScreen();
  });
});
