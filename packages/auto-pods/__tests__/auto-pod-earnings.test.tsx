/**
 * The potential-earnings calculators.
 *
 * Every Auto Pod card carries one, and the whole point of it is that the three
 * partners are paid for DIFFERENT things: a venue for the seats its space
 * holds, a host for what is left after every Finance deduction. So there are
 * two calculators over one piece of chrome — and what a partner works out in
 * either is theirs alone, never saved, and always beats the server's figure on
 * their own card.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoPodEarningsButton } from '../src/earnings/AutoPodEarningsButton';
import { EarningsDialogShell } from '../src/earnings/EarningsDialogShell';
import { VenueEarningsDialog } from '../src/earnings/VenueEarningsDialog';
import { useAutoPodEarnings } from '../src/earnings/useAutoPodEarnings';
import { HostEarningsDialog } from '../src/host/HostEarningsDialog';
import { AUTO_POD_HOST_PROJECTION } from '../src/queries';
import type { AutoPodVenueOption } from '../src/venue/AutoPodVenuePicker';

/** Echoes the key back, so an assertion reads as the key that was rendered. */
const t = (key: string) => key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();
const formatMoney = (amount: number) => `₹${amount}`;

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>,
  );

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  ({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'OPEN',
    pod_title: 'Weekly Badminton',
    pod_description: '',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    pod_amount: 250,
    no_of_spots: 8,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    ...over,
  }) as AutoPodRow;

const venue = (over: Partial<AutoPodVenueOption> = {}): AutoPodVenueOption => ({
  id: 'v-1',
  venue_name: 'Play Arena',
  status: 'APPROVED',
  is_active: true,
  location_id: 'loc-blr',
  city: 'Bengaluru',
  capacity: 40,
  capacity_items: [
    { label: 'Court 1', capacity: 6 },
    { label: 'Rooftop', capacity: 20 },
  ],
  venue_category: null,
  ...over,
});

afterEach(() => {
  vi.clearAllMocks();
});

// ------------------------------------------------------------- the button ---

describe('AutoPodEarningsButton', () => {
  it('opens the calculator for the card it sits under', () => {
    const onClick = vi.fn();
    wrap(<AutoPodEarningsButton labels={labels} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('auto-pod-view-earnings'));

    expect(screen.getByTestId('auto-pod-view-earnings')).toHaveTextContent(labels.viewEarningsCta);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// -------------------------------------------------------------- the shell ---

describe('EarningsDialogShell', () => {
  // A calculator is something a partner opens to read and then leaves, so it
  // is dismissible from either end — the ✕ where a dialog's is, and a Close
  // under the content they were reading.
  it('closes from the corner icon and from the button at the foot alike', () => {
    const onClose = vi.fn();
    wrap(
      <EarningsDialogShell labels={labels} open onClose={onClose}>
        <p>body</p>
      </EarningsDialogShell>,
    );

    expect(document.body.textContent).toContain(labels.earningsTitle);
    expect(document.body.textContent).toContain('body');

    fireEvent.click(screen.getByTestId('auto-pod-earnings-close-icon'));
    fireEvent.click(screen.getByTestId('auto-pod-earnings-close'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing while it is closed', () => {
    wrap(
      <EarningsDialogShell labels={labels} open={false} onClose={vi.fn()}>
        <p>body</p>
      </EarningsDialogShell>,
    );

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
});

// ------------------------------------------------------- the venue's sums ---

describe('VenueEarningsDialog', () => {
  const open = (over: Partial<AutoPodVenueOption> | null = {}) =>
    wrap(
      <VenueEarningsDialog
        venue={over === null ? null : venue(over)}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
    );

  it('lists every space the venue publishes, with the seats it holds', () => {
    open();

    expect(document.body.textContent).toContain('Court 1');
    expect(document.body.textContent).toContain('Rooftop');
    expect(document.body.textContent).toContain(labels.earningsSpaceCapacity(6));
    expect(document.body.textContent).toContain(labels.earningsSpaceCapacity(20));
  });

  // The sum is spelled out rather than just totalled: the point of the dialog
  // is to show a venue where the figure came from.
  it('spells the multiplication out once a price is typed, per space', () => {
    open();
    const [court] = screen.getAllByLabelText(labels.ticketPrice);

    expect(document.body.textContent).toContain(labels.earningsEnterPrice);

    fireEvent.change(court, { target: { value: '250' } });

    expect(document.body.textContent).toContain(labels.earningsFormula('₹250', 6, '₹1500'));
  });

  // A venue that named no space is one undivided room, so the calculator opens
  // on its whole capacity rather than on nothing.
  it('stands the whole venue in when it has named no space', () => {
    open({ capacity_items: [] });

    expect(document.body.textContent).toContain(labels.earningsWholeVenue);
    expect(document.body.textContent).toContain(labels.earningsSpaceCapacity(40));
  });

  it('says there is nothing to project for a venue with no capacity at all', () => {
    open({ capacity: 0, capacity_items: [] });
    expect(document.body.textContent).toContain(labels.earningsNoSpaces);

    open(null);
    expect(document.body.textContent).toContain(labels.earningsNoSpaces);
  });

  // The card shows ONE number, so the best a space could take is what rides
  // back — a venue comparing its spaces is choosing the one it would offer.
  it('reports the best figure it reached when it closes, and none when nothing was typed', () => {
    const onEarnings = vi.fn();
    const onClose = vi.fn();
    const view = wrap(
      <VenueEarningsDialog
        venue={venue()}
        labels={labels}
        open
        onClose={onClose}
        formatMoney={formatMoney}
        onEarnings={onEarnings}
      />,
    );

    const [court, rooftop] = screen.getAllByLabelText(labels.ticketPrice);
    fireEvent.change(court, { target: { value: '250' } });
    fireEvent.change(rooftop, { target: { value: '100' } });
    fireEvent.click(screen.getByTestId('auto-pod-earnings-close'));

    // ₹250 × 6 = ₹1,500 against ₹100 × 20 = ₹2,000.
    expect(onEarnings).toHaveBeenCalledWith(2000);
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    onEarnings.mockClear();
    wrap(
      <VenueEarningsDialog
        venue={venue()}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
        onEarnings={onEarnings}
      />,
    );
    fireEvent.click(screen.getByTestId('auto-pod-earnings-close'));

    expect(onEarnings).toHaveBeenCalledWith(null);
  });

  // A surface that does not want the figure back must still be able to close.
  it('closes cleanly for a caller that asked for no figure', () => {
    const onClose = vi.fn();
    wrap(
      <VenueEarningsDialog
        venue={venue()}
        labels={labels}
        open
        onClose={onClose}
        formatMoney={formatMoney}
      />,
    );

    fireEvent.click(screen.getByTestId('auto-pod-earnings-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// -------------------------------------------------------- the host's sums ---

const projectionMock = (
  vars: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
): MockedResponse => ({
  maxUsageCount: Number.POSITIVE_INFINITY,
  request: {
    query: AUTO_POD_HOST_PROJECTION,
    variables: { auto_pod_doc_id: 'ap-1', pod_amount: 250, no_of_spots: 8, ...vars },
  },
  result: {
    data: {
      autoPodHostProjection: {
        __typename: 'AutoPodHostProjection',
        min_spots: 2,
        max_spots: 20,
        pod_amount: 250,
        no_of_spots: 8,
        total_collection: 1750,
        gst_amount: 267,
        platform_fee_amount: 88,
        venue_amount: 500,
        club_admin_amount: 100,
        host_receives: 1400,
        viable: true,
        ...over,
      },
    },
  },
});

describe('HostEarningsDialog', () => {
  // The host's calculator is Step 4 of Create a Pod: the venue's ceiling, a
  // price, a slider between the server's own bounds, and the server's waterfall.
  it('states the venue ceiling and what the server says the numbers pay', async () => {
    wrap(
      <HostEarningsDialog
        row={row()}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
      [projectionMock()],
    );
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.earningsTotalSpots(20));
    expect(screen.getByLabelText(labels.earningsAddPrice)).toHaveValue(250);
    expect(document.body.textContent).toContain(labels.projectionHost('₹1400'));
  });

  // The card's earn line follows the calculator LIVE, so closing it is never
  // the moment a host discovers what they had worked out.
  it('reports the host’s payout as they price it, and nothing while it is unpriced', async () => {
    const onEarnings = vi.fn();
    wrap(
      <HostEarningsDialog
        row={row()}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
        onEarnings={onEarnings}
      />,
      [projectionMock()],
    );
    await settle();
    await settle();

    expect(onEarnings).toHaveBeenCalledWith(1400);

    fireEvent.change(screen.getByLabelText(labels.earningsAddPrice), { target: { value: '' } });
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.earningsEnterPrice);
    expect(onEarnings).toHaveBeenLastCalledWith(null);
  });

  // Numbers the server would refuse pay nothing, so nothing is what the card
  // is told — a "You could earn ₹0" would be a confident wrong answer.
  it('reports nothing for numbers the server calls unviable', async () => {
    const onEarnings = vi.fn();
    wrap(
      <HostEarningsDialog
        row={row()}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
        onEarnings={onEarnings}
      />,
      [projectionMock({}, { viable: false, host_receives: 0 })],
    );
    await settle();
    await settle();

    expect(document.body.textContent).toContain(labels.projectionNotViable);
    expect(onEarnings).toHaveBeenLastCalledWith(null);
  });

  // The slider has no honest range until the server names one, so an offer
  // carrying fewer spots than the activity allows is pulled up to its floor.
  it('pulls a spot count below the activity’s minimum up to it', async () => {
    wrap(
      <HostEarningsDialog
        row={row({ no_of_spots: 1 })}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
      [
        projectionMock({ no_of_spots: 1 }, { min_spots: 4, no_of_spots: 1 }),
        projectionMock({ no_of_spots: 4 }, { min_spots: 4, no_of_spots: 4 }),
      ],
    );
    await settle();
    await settle();

    expect(screen.getByLabelText(labels.spotsField)).toHaveValue('4');
  });

  // With no projection there is no range to drag along, so the spots fall back
  // to a plain field — which shows empty rather than a meaningless zero.
  it('falls back to a plain spots field, left empty, before the server answers', async () => {
    wrap(
      <HostEarningsDialog
        row={row({ pod_amount: 0, no_of_spots: 0 })}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
    );
    await settle();

    const spots = screen.getByLabelText(labels.spotsField);
    expect(spots).toHaveValue(null);

    fireEvent.change(spots, { target: { value: '6' } });
    await settle();
    expect(spots).toHaveValue(6);

    fireEvent.change(spots, { target: { value: '' } });
    await settle();
    expect(spots).toHaveValue(null);
  });

  it('says a ticket price that is not a positive number is not one', async () => {
    wrap(
      <HostEarningsDialog
        row={row()}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
      [projectionMock()],
    );
    await settle();

    fireEvent.change(screen.getByLabelText(labels.earningsAddPrice), { target: { value: '0' } });
    await settle();

    expect(document.body.textContent).toContain(labels.earningsPricePositive);
  });

  it('reads nothing at all while it is closed', async () => {
    const onEarnings = vi.fn();
    wrap(
      <HostEarningsDialog
        row={row()}
        labels={labels}
        open={false}
        onClose={vi.fn()}
        formatMoney={formatMoney}
        onEarnings={onEarnings}
      />,
      [projectionMock()],
    );
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(onEarnings).not.toHaveBeenCalled();
  });

  it('opens without a row rather than pricing an offer it does not have', async () => {
    wrap(
      <HostEarningsDialog
        row={null}
        labels={labels}
        open
        onClose={vi.fn()}
        formatMoney={formatMoney}
      />,
    );
    await settle();

    expect(document.body.textContent).toContain(labels.earningsEnterPrice);
  });
});

// ------------------------------------------------------------- the state ----

/** A page, reduced to the two things it does with the hook. */
function EarningsHarness({ rows }: Readonly<{ rows: AutoPodRow[] }>) {
  const earnings = useAutoPodEarnings();
  return (
    <div>
      <span data-testid="open-row">{earnings.row?.id ?? 'none'}</span>
      <span data-testid="values">{JSON.stringify(earnings.values)}</span>
      {rows.map((r) => (
        <button key={r.id} type="button" onClick={() => earnings.open(r)}>
          {`open-${r.id}`}
        </button>
      ))}
      <button type="button" onClick={() => earnings.record(1500)}>
        record
      </button>
      <button type="button" onClick={() => earnings.record(null)}>
        clear
      </button>
      <button type="button" onClick={earnings.close}>
        close
      </button>
    </div>
  );
}

describe('useAutoPodEarnings', () => {
  const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
  const values = () => screen.getByTestId('values').textContent;

  it('holds one open calculator at a time and files its figure under that row', () => {
    render(<EarningsHarness rows={[row(), row({ id: 'ap-2' })]} />);

    press('open-ap-1');
    expect(screen.getByTestId('open-row')).toHaveTextContent('ap-1');
    press('record');
    expect(values()).toBe('{"ap-1":1500}');

    press('open-ap-2');
    press('record');
    expect(values()).toBe('{"ap-1":1500,"ap-2":1500}');

    press('close');
    expect(screen.getByTestId('open-row')).toHaveTextContent('none');
  });

  it('clears a figure on null, and files nothing with no calculator open', () => {
    render(<EarningsHarness rows={[row()]} />);

    press('record');
    expect(values()).toBe('{}');

    press('open-ap-1');
    press('record');
    press('clear');
    expect(values()).toBe('{}');
  });
});
