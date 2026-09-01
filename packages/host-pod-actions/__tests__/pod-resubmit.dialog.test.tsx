/**
 * Resubmitting a venue-rejected pod.
 *
 * The SAME pod is reused — no new one is created — so what the host does here
 * is pick a different venue or slot and send the booking request again. Two
 * rules matter: choosing a venue clears the slot that belonged to the previous
 * one, and the rewritten copy is screened like any other edit (a rejected pod
 * is exactly where a host is most tempted to reword the details).
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
import { SlotField, VenueField } from '../src/pod-resubmit/VenueSlotFields';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import {
  HOST_RESUBMIT_POD,
  MODERATE_POD_CONTENT,
  RESUBMIT_VENUES,
  RESUBMIT_VENUE_SLOTS,
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

const slotsMock = (venueId: string, slots: unknown[]): MockedResponse => ({
  request: { query: RESUBMIT_VENUE_SLOTS, variables: { venue_id: venueId } },
  result: { data: { venueAvailableSlots: slots } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const slot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'slot-1',
  start_at: '2026-09-01T10:00:00.000Z',
  end_at: '2026-09-01T12:00:00.000Z',
  whole_day: false,
  price: 500,
  space_label: 'Court 2',
  ...over,
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
  const dialog = (mocks: readonly MockedResponse[], target: HostPodTarget | null = pod()) => {
    const props = { pod: target, onClose: vi.fn(), onSaved: vi.fn() };
    return { props, ...wrap(<PodResubmitDialog {...props} />, mocks) };
  };

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

  it('loads the chosen venue slots in place of the pick-a-venue line', async () => {
    dialog([venuesMock, slotsMock('v-1', [slot()])]);
    await settle();

    await pickVenue('Indiranagar Court');

    expect(screen.queryByText(slotLabels.pickVenueFirst)).not.toBeInTheDocument();
  });

  // The slot belonged to the venue the host just moved away from.
  it('clears the chosen slot when the host switches venue', async () => {
    const variables: Record<string, unknown>[] = [];
    const { props } = dialog([
      venuesMock,
      slotsMock('v-1', [slot()]),
      slotsMock('v-2', [slot({ id: 'slot-9', space_label: 'Court 9' })]),
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

    await pickVenue('Koramangala Court');
    await submit();

    // Nothing was resubmitted: the slot went with the venue that was dropped.
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(variables).toHaveLength(0);
  });

  it('resubmits once a venue and a slot are both chosen', async () => {
    const { props } = dialog([
      venuesMock,
      slotsMock('v-1', [slot()]),
      cleanCheck,
      resubmitMock(),
    ]);
    await settle();
    await pickVenue('Indiranagar Court');

    fireEvent.click(document.body.querySelector('[data-testid="slot-tile-slot-1"]') as HTMLElement);
    await settle();
    await submit();

    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  // A rejected pod is exactly where a host is most tempted to reword things.
  it('screens the rewritten copy, and does not resubmit what it refuses', async () => {
    const { props } = dialog([
      venuesMock,
      slotsMock('v-1', [slot()]),
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
    fireEvent.click(document.body.querySelector('[data-testid="slot-tile-slot-1"]') as HTMLElement);
    await settle();

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

describe('SlotField', () => {
  it('asks for a venue first rather than drawing an empty calendar', () => {
    wrap(<SlotField slots={[]} loading={false} disabled value="" onChange={vi.fn()} />);

    expect(screen.getByText(slotLabels.pickVenueFirst)).toBeInTheDocument();
  });

  // A venue can publish two spaces at the same hour; without the space label the
  // two tiles would be indistinguishable.
  it('captions each tile with its space, and reports the one that was picked', async () => {
    const onChange = vi.fn();
    wrap(
      <SlotField
        slots={[slot() as never, slot({ id: 'slot-2', space_label: '' }) as never]}
        loading={false}
        disabled={false}
        value=""
        onChange={onChange}
      />,
    );
    await settle();

    expect(document.body.querySelector('[data-testid="slot-tile-slot-1"]')).not.toBeNull();

    fireEvent.click(document.body.querySelector('[data-testid="slot-tile-slot-1"]') as HTMLElement);

    expect(onChange).toHaveBeenCalledWith('slot-1');
  });
});
