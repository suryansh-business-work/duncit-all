/**
 * Resubmitting a venue-rejected pod.
 *
 * The SAME pod is reused — no new one is created — so what the host does here
 * is pick a different venue, a window it is open for and how it is paid, and
 * send the offer again. Two rules matter: choosing a venue clears the window
 * that belonged to the previous one, and the rewritten copy is screened like any
 * other edit (a rejected pod is exactly where a host is most tempted to reword
 * the details).
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
// The slot calendar is MUI X, which refuses to render without its own
// localization context — the surface supplies one; here it does not.
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodResubmitDialog from '../src/pod-resubmit/PodResubmitDialog';
import { OfferWindowField, VenueField } from '../src/pod-resubmit/VenueSlotFields';
import { RESUBMIT_VENUE_TERMS } from '../src/pod-resubmit/useResubmitVenueTerms';
import type { VenueOfferPrefill } from '../src';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import {
  HOST_RESUBMIT_POD,
  MODERATE_POD_CONTENT,
  RESUBMIT_OFFER_CALENDAR,
  RESUBMIT_VENUES,
} from '../src/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import type { HostPodTarget } from '../src/types';

const labels = labelsFor();
const slotLabels = hostActionsConfig().slotLabels;
const testTheme = createTheme();
const IMG = 'https://cdn.duncit.com/pod/a.jpg';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget =>
  (({
    id: 'pod-1',
    pod_title: 'Sunday Badminton',
    pod_description: 'Doubles at Court 2, all levels welcome.',
    pod_images_and_videos: [{ url: IMG, type: 'IMAGE' }],
    venue_approval_status: 'DECLINED',
    no_of_spots: 12,
    ...over
  }) as HostPodTarget);

const venuesMock: MockedResponse = {
  request: { query: RESUBMIT_VENUES },
  result: {
    data: {
      publicVenues: [
        { __typename: 'Venue', id: 'v-1', venue_name: 'Indiranagar Court', city: 'Bengaluru' },
        { __typename: 'Venue', id: 'v-2', venue_name: 'Koramangala Court', city: '' },
      ],
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const START = '2030-06-01T10:00:00.000Z';
const END = '2030-06-01T12:00:00.000Z';
/** The venue is open 10:00–12:00 UTC on 1 June 2030 with nothing booked. */
const calendarMock = (venueId: string): MockedResponse => ({
  request: {
    query: RESUBMIT_OFFER_CALENDAR,
    variables: (v: Record<string, unknown>) => v.venue_id === venueId,
  },
  result: {
    data: {
      venueOfferCalendar: {
        __typename: 'VenueBookingCalendar',
        buffer_minutes: 0,
        min_notice_minutes: 0,
        days: [
          {
            __typename: 'VenueBookingDay',
            date: '2030-06-01',
            closed_reason: null,
            open: START,
            close: END,
            busy: [],
            slots: [],
          },
        ],
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});
const startTile = () => document.body.querySelector(`[data-testid="slot-tile-${START}"]`) as HTMLElement;

/** The picked venue's bounds on an offer: what it holds and the fewest guests it takes. */
const termsMock = (venueId: string, terms: { capacity: number; offer_min_guests: number }): MockedResponse => ({
  request: { query: RESUBMIT_VENUE_TERMS, variables: { venue_id: venueId } },
  result: {
    data: { publicVenue: { __typename: 'Venue', id: venueId, capacity_items: [], ...terms } },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const cleanCheck: MockedResponse = {
  request: { query: MODERATE_POD_CONTENT, variables: () => true },
  result: {
    data: { moderatePodContent: { __typename: 'PodContentCheck', allowed: true, violations: [] } },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const resubmitMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: HOST_RESUBMIT_POD, variables: () => true },
    result: {
      data: {
        hostResubmitPod: {
          __typename: 'Pod',
          id: 'pod-1',
          pod_title: 'Sunday Badminton',
          venue_approval_status: 'PENDING',
          is_active: true,
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const pickVenue = async (name: string) => {
  fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.venue)));
  await settle();
  fireEvent.click(screen.getByRole('option', { name: new RegExp(name) }));
  await settle();
  await settle();
};

const chooseTerms = async () => {
  fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.offerModelLabel)));
  await settle();
  fireEvent.click(screen.getByRole('option', { name: labels.offerModelPerGuest }));
  fireEvent.change(screen.getByTestId('pod-resubmit-offer-rate'), { target: { value: '300' } });
  await settle();
};

const offeringsBox = () => screen.getByRole('textbox', { name: /What you need from the venue/ });
const noteBox = () => screen.getByRole('textbox', { name: 'Request from the venue (optional)' });
const askFor = async (offerings: string) => {
  fireEvent.change(offeringsBox(), { target: { value: offerings } });
  await settle();
};

const submit = async () => {
  fireEvent.submit(document.querySelector('#pod-resubmit-form') as HTMLFormElement);
  await settle();
  await settle();
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodResubmitDialog', () => {
  const dialog = (
    mocks: readonly MockedResponse[],
    target: HostPodTarget | null = pod(),
    offerPrefill?: VenueOfferPrefill,
  ) => {
    const props = { pod: target, onClose: vi.fn(), onSaved: vi.fn(), offerPrefill };
    return { props, ...wrap(<PodResubmitDialog {...props} />, mocks) };
  };
  /** Records what the resubmission was sent. */
  const recording = (sent: Record<string, any>[]) =>
    resubmitMock({
      request: {
        query: HOST_RESUBMIT_POD,
        variables: (v: Record<string, any>) => {
          sent.push(v);
          return true;
        },
      },
    });

  it('opens on the rejected pod, explaining what resubmitting does', async () => {
    dialog([venuesMock]);
    await settle();

    expect(screen.getByText(labels.resubmitHint)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sunday Badminton')).toBeInTheDocument();
    // Nothing is picked yet, so there is no slot calendar to read.
    expect(screen.getByText(slotLabels.pickVenueFirst)).toBeInTheDocument();
  });

  it('offers the venues, naming the city where there is one', async () => {
    dialog([venuesMock]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.venue)));
    await settle();

    expect(screen.getByRole('option', { name: 'Indiranagar Court · Bengaluru' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Koramangala Court' })).toBeInTheDocument();
  });

  it("loads the chosen venue's calendar in place of the pick-a-venue line, and asks for terms", async () => {
    dialog([venuesMock, calendarMock('v-1')]);
    await settle();

    await pickVenue('Indiranagar Court');

    expect(screen.queryByText(slotLabels.pickVenueFirst)).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-resubmit-offer-model')).toBeInTheDocument();
    expect(startTile()).not.toBeNull();
  });

  // The window belonged to the venue the host just moved away from.
  it('clears the chosen window when the host switches venue', async () => {
    const variables: Record<string, unknown>[] = [];
    const { props } = dialog([
      venuesMock,
      calendarMock('v-1'),
      calendarMock('v-2'),
      cleanCheck,
      resubmitMock({
        // Apollo 4 carries the matcher inside the request; this one records
        // what the mutation was actually sent.
        request: {
          query: HOST_RESUBMIT_POD,
          variables: (v: Record<string, unknown>) => {
            variables.push(v);
            return true;
          },
        },
      }),
    ]);
    await settle();
    await pickVenue('Indiranagar Court');
    fireEvent.click(startTile());
    await settle();
    await chooseTerms();

    await pickVenue('Koramangala Court');
    await submit();

    // Nothing was resubmitted: the window went with the venue that was dropped.
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(variables).toHaveLength(0);
  });

  it('holds the resubmission until the venue is told how it is paid', async () => {
    const { props } = dialog([venuesMock, calendarMock('v-1'), cleanCheck, resubmitMock()]);
    await settle();
    await pickVenue('Indiranagar Court');
    fireEvent.click(startTile());
    await settle();

    await submit();

    expect(props.onSaved).not.toHaveBeenCalled();
    expect(screen.getByText(labels.offerModelRequired)).toBeInTheDocument();
    expect(screen.getByText(labels.offerRateRequired)).toBeInTheDocument();
  });

  it('resubmits an offer for the picked window once a venue, terms and what the host needs are chosen', async () => {
    const sent: Record<string, any>[] = [];
    const { props } = dialog([venuesMock, calendarMock('v-1'), cleanCheck, recording(sent)]);
    await settle();
    await pickVenue('Indiranagar Court');
    fireEvent.click(startTile());
    await settle();
    await chooseTerms();
    await askFor('- Two courts\n\nShuttles');
    fireEvent.change(noteBox(), { target: { value: '  Doubles only  ' } });
    await submit();

    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(sent.at(-1)?.input.no_of_spots).toBe(12);
    expect(sent.at(-1)?.input.venue_offer).toEqual({
      start_at: START,
      end_at: '2030-06-01T10:30:00.000Z',
      space_label: '',
      pax: 12,
      pets: false,
      model: 'PER_GUEST',
      rate: 300,
      offerings: ['Two courts', 'Shuttles'],
      note: 'Doubles only',
    });
  });

  it('holds the resubmission until the host says what they need from the venue', async () => {
    const sent: Record<string, any>[] = [];
    const { props } = dialog([venuesMock, calendarMock('v-1'), cleanCheck, recording(sent)]);
    await settle();
    await pickVenue('Indiranagar Court');
    fireEvent.click(startTile());
    await settle();
    await chooseTerms();
    expect(offeringsBox()).toBeRequired();

    await submit();

    expect(props.onSaved).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
    expect(screen.getByText('Add at least one thing you need from the venue')).toBeInTheDocument();
  });

  it("raises the spots to the venue's minimum, and sends the offer for that many", async () => {
    const sent: Record<string, any>[] = [];
    const { props } = dialog([
      venuesMock,
      calendarMock('v-1'),
      termsMock('v-1', { capacity: 40, offer_min_guests: 16 }),
      cleanCheck,
      recording(sent),
    ]);
    await settle();
    await pickVenue('Indiranagar Court');
    await settle();

    expect(screen.getByTestId('spots-value')).toHaveTextContent('16');
    expect(screen.getByTestId('spots-bounds-hint')).toHaveTextContent('This venue takes bookings for at least 16 guests.');

    fireEvent.click(startTile());
    await settle();
    await chooseTerms();
    await askFor('Two courts');
    fireEvent.click(screen.getByRole('switch', { name: 'Pets are coming' }));
    await submit();

    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(sent.at(-1)?.input.no_of_spots).toBe(16);
    expect(sent.at(-1)?.input.venue_offer).toMatchObject({ pax: 16, pets: true });

    // Anything up to what the venue holds can still be picked.
    fireEvent.change(screen.getByRole('slider'), { target: { value: 24 } });
    await submit();
    expect(sent.at(-1)?.input.venue_offer).toMatchObject({ pax: 24 });
  });

  it('leaves spots it does not know for the host, rather than inventing a count', async () => {
    dialog([venuesMock, calendarMock('v-1'), termsMock('v-1', { capacity: 40, offer_min_guests: 16 })], pod({ no_of_spots: null }));
    await settle();
    await pickVenue('Indiranagar Court');
    await settle();

    expect(screen.getByTestId('spots-value')).toHaveTextContent('0');
  });

  it('sends a new offer from the declined terms when it is handed them', async () => {
    const sent: Record<string, any>[] = [];
    const declined: VenueOfferPrefill = {
      model: 'FLAT',
      rate: 4500,
      offerings: ['Two courts', 'Shuttles'],
      note: 'Doubles only',
      start_at: START,
      end_at: END,
      space_label: '',
      pets: true,
    };
    const { props } = dialog(
      [venuesMock, calendarMock('v-1'), termsMock('v-1', { capacity: 40, offer_min_guests: 8 }), cleanCheck, recording(sent)],
      pod({ venue_id: 'v-1' }),
      declined,
    );
    await settle();
    await settle();

    // Every term the host offered before is where they left it.
    expect(screen.getByTestId('pod-resubmit-offer-rate')).toHaveValue('4500');
    expect(offeringsBox()).toHaveValue('Two courts\nShuttles');
    expect(noteBox()).toHaveValue('Doubles only');
    expect(screen.getByRole('switch', { name: 'Pets are coming' })).toBeChecked();

    await submit();

    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(sent.at(-1)?.input).toMatchObject({
      venue_id: 'v-1',
      no_of_spots: 12,
      venue_offer: {
        start_at: START,
        end_at: END,
        space_label: '',
        pax: 12,
        pets: true,
        model: 'FLAT',
        rate: 4500,
        offerings: ['Two courts', 'Shuttles'],
        note: 'Doubles only',
      },
    });
  });

  it('keeps what the host typed when the parent hands the same terms again', async () => {
    const declined: VenueOfferPrefill = {
      model: 'FLAT',
      rate: 4500,
      offerings: ['Two courts'],
      note: '',
      start_at: START,
      end_at: END,
      space_label: '',
      pets: false,
    };
    const target = pod({ venue_id: 'v-1' });
    const { rerender } = dialog([venuesMock, calendarMock('v-1')], target, declined);
    await settle();
    fireEvent.change(noteBox(), { target: { value: 'Doubles only' } });
    await settle();

    rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[venuesMock, calendarMock('v-1')]}>
        <ThemeProvider theme={testTheme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <HostPodActionsProvider {...hostActionsConfig()}>
              <PodResubmitDialog pod={target} onClose={vi.fn()} onSaved={vi.fn()} offerPrefill={{ ...declined }} />
            </HostPodActionsProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    expect(noteBox()).toHaveValue('Doubles only');
  });

  it('drops the space with the venue it belonged to', async () => {
    const sent: Record<string, any>[] = [];
    const declined: VenueOfferPrefill = {
      model: 'FLAT',
      rate: 4500,
      offerings: ['Two courts'],
      note: '',
      start_at: START,
      end_at: END,
      space_label: 'Court 2',
      pets: false,
    };
    dialog(
      [
        venuesMock,
        calendarMock('v-1'),
        calendarMock('v-2'),
        // Court 2 is not one of this venue's spaces, so the whole venue's capacity bounds the offer.
        termsMock('v-1', { capacity: 40, offer_min_guests: 8 }),
        cleanCheck,
        recording(sent),
      ],
      pod({ venue_id: 'v-1' }),
      declined,
    );
    await settle();
    await settle();
    expect(screen.getByTestId('spots-value')).toHaveTextContent('12');
    await pickVenue('Koramangala Court');
    fireEvent.click(startTile());
    await settle();
    await submit();

    expect(sent.at(-1)?.input.venue_offer).toMatchObject({ space_label: '' });
  });

  // A rejected pod is exactly where a host is most tempted to reword things.
  it('screens the rewritten copy, and does not resubmit what it refuses', async () => {
    const { props } = dialog([
      venuesMock,
      calendarMock('v-1'),
      {
        request: { query: MODERATE_POD_CONTENT, variables: () => true },
        result: {
          data: {
            moderatePodContent: {
              __typename: 'PodContentCheck',
              allowed: false,
              violations: [
                {
                  __typename: 'PodContentViolation',
                  field: 'pod_description',
                  type: 'CONTACT_DETAILS',
                  message: 'The description shares a phone number',
                  evidence: null,
                },
              ],
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      resubmitMock(),
    ]);
    await settle();
    await pickVenue('Indiranagar Court');
    fireEvent.click(startTile());
    await settle();
    await chooseTerms();
    // A new offer has to say what it needs from the venue before it is screened.
    await askFor('Two courts');

    await submit();

    expect(screen.getByTestId('pod-content-check')).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it('closes without resubmitting anything', async () => {
    const { props } = dialog([venuesMock]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.cancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSaved).not.toHaveBeenCalled();
  });
});

describe('VenueField', () => {
  it('shows what is wrong in place of the hint', () => {
    wrap(
      <VenueField venues={[]} value="" error="Pick a venue" onChange={vi.fn()} />,
    );

    expect(screen.getByText('Pick a venue')).toBeInTheDocument();
    expect(screen.queryByText(labels.venueHint)).not.toBeInTheDocument();
  });

  it('shows the hint while nothing is wrong', () => {
    wrap(<VenueField venues={[]} value="" onChange={vi.fn()} />);

    expect(screen.getByText(labels.venueHint)).toBeInTheDocument();
  });
});

describe('OfferWindowField', () => {
  it('asks for a venue first rather than drawing an empty calendar', () => {
    wrap(<OfferWindowField venueId="" start="" end="" onWindow={vi.fn()} />);

    expect(screen.getByText(slotLabels.pickVenueFirst)).toBeInTheDocument();
  });

  it('offers a start with its first end, then every end up to closing', async () => {
    const onWindow = vi.fn();
    const { rerender } = wrap(<OfferWindowField venueId="v-1" start="" end="" onWindow={onWindow} />, [calendarMock('v-1')]);
    await settle();
    await settle();

    fireEvent.click(startTile());
    expect(onWindow).toHaveBeenCalledWith(START, '2030-06-01T10:30:00.000Z');

    rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[calendarMock('v-1')]}>
        <ThemeProvider theme={testTheme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <HostPodActionsProvider {...hostActionsConfig()}>
              <OfferWindowField venueId="v-1" start={START} end="2030-06-01T10:30:00.000Z" onWindow={onWindow} />
            </HostPodActionsProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();
    await settle();
    expect(screen.getByText(labels.offerEndHint)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.offerEnd)));
    await settle();
    fireEvent.click(screen.getAllByRole('option').at(-1) as HTMLElement);
    expect(onWindow).toHaveBeenLastCalledWith(START, END);
  });

  it('says no end fits a start outside what the venue offers', async () => {
    wrap(<OfferWindowField venueId="v-1" start="2030-07-01T10:00:00.000Z" end="" onWindow={vi.fn()} />, [calendarMock('v-1')]);
    await settle();
    await settle();

    expect(screen.getByText(labels.offerNoEnd)).toBeInTheDocument();
  });
});
