/**
 * Editing a pod, and cancelling one.
 *
 * Both are writes a host makes against a pod that is already live, so both have
 * a gate in front of them: an edit runs the SAME content check publishing does
 * (a pod that met the guidelines the day it was created can be renamed into one
 * that does not), and a cancel states who it affects and what it refunds before
 * the host confirms it.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodCancelDialog from '../src/PodCancelDialog';
import PodEditDialog from '../src/PodEditDialog';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import {
  HOST_DELETE_POD,
  HOST_POD_DELETE_IMPACT,
  HOST_UPDATE_POD,
  MODERATE_POD_CONTENT,
  POD_SPOT_LIMITS,
} from '../src/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import type { HostPodTarget } from '../src/types';

const labels = labelsFor();
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
    no_of_spots: 8,
    ...over
  }) as HostPodTarget);

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const cleanCheck: MockedResponse = {
  request: { query: MODERATE_POD_CONTENT },
  variableMatcher: () => true,
  result: { data: { moderatePodContent: { __typename: 'PodContentCheck', allowed: true, violations: [] } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodEditDialog', () => {
  const limitsMock = (over: Record<string, unknown> = {}): MockedResponse => ({
    request: { query: POD_SPOT_LIMITS, variables: { pod_doc_id: 'pod-1' } },
    result: {
      data: {
        podSpotLimits: {
          __typename: 'PodSpotLimits',
          current: 8,
          min: 2,
          max: 20,
          seats_taken: 4,
          venue_capacity: 20,
          min_pax: 2,
          slidable: true,
          can_decrease: true,
          ...over,
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  });

  const saveMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: HOST_UPDATE_POD },
      variableMatcher: () => true,
      result: {
        data: {
          hostUpdatePod: {
            __typename: 'Pod',
            id: 'pod-1',
            pod_title: 'Sunday Badminton',
            pod_description: 'Doubles at Court 2, all levels welcome.',
            no_of_spots: 8,
            pod_images_and_videos: [{ __typename: 'PodMedia', url: IMG, type: 'IMAGE' }],
          },
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const dialog = (mocks: readonly MockedResponse[], target: HostPodTarget | null = pod()) => {
    const props = { pod: target, onClose: vi.fn(), onSaved: vi.fn() };
    return { props, ...wrap(<PodEditDialog {...props} />, mocks) };
  };

  const save = async () => {
    fireEvent.submit(document.querySelector('#pod-edit-form') as HTMLFormElement);
    await settle();
    await settle();
    await settle();
  };

  it('renders nothing when there is no pod to edit', () => {
    dialog([], null);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens pre-filled from the pod being edited', async () => {
    dialog([limitsMock()]);
    await settle();

    expect(screen.getByLabelText(/Sunday|fieldTitle/i)).toBeDefined();
    expect(screen.getByDisplayValue('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByDisplayValue(IMG)).toBeInTheDocument();
  });

  // The capacity is seeded from the SERVER's current figure rather than the row
  // the list happened to hold.
  it('offers the capacity control only once the server range has arrived', async () => {
    dialog([limitsMock()]);
    expect(screen.queryByText(labels.spotsVenueHint(20, 4))).not.toBeInTheDocument();

    await settle();
    await settle();

    expect(screen.getByText(labels.spotsVenueHint(20, 4))).toBeInTheDocument();
  });

  it('saves the edit and tells the caller, once the content check is clean', async () => {
    const { props } = dialog([limitsMock(), cleanCheck, saveMock()]);
    await settle();
    await settle();

    await save();

    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });

  // Until this check existed the edit screen was the way past the guidelines:
  // the flagged word simply arrived a day late.
  it('refuses the save and pins what the check flagged on its own field', async () => {
    const { props } = dialog([
      limitsMock(),
      {
        request: { query: MODERATE_POD_CONTENT },
        variableMatcher: () => true,
        result: {
          data: {
            moderatePodContent: {
              __typename: 'PodContentCheck',
              allowed: false,
              violations: [
                {
                  __typename: 'PodContentViolation',
                  field: 'pod_title',
                  type: 'PROFANITY',
                  message: 'The title uses language the guidelines do not allow',
                  evidence: null,
                },
              ],
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      saveMock(),
    ]);
    await settle();
    await settle();

    await save();

    expect(screen.getByTestId('pod-content-check')).toBeInTheDocument();
    expect(
      screen.getAllByText('The title uses language the guidelines do not allow').length,
    ).toBeGreaterThan(0);
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it('states any other failure rather than reporting a save it never made', async () => {
    const { props } = dialog([
      limitsMock(),
      cleanCheck,
      saveMock({
        result: { errors: [{ message: 'That pod is already completed' } as never] },
      }),
    ]);
    await settle();
    await settle();

    await save();

    expect(screen.getByText(/That pod is already completed/)).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it('will not save a pod whose gallery lost its last image', async () => {
    const { props } = dialog([limitsMock(), cleanCheck, saveMock()]);
    await settle();
    await settle();

    fireEvent.change(screen.getByLabelText('media'), { target: { value: '' } });
    await save();

    expect(screen.getByText(labels.imageRequired)).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it('closes without saving anything', async () => {
    const { props } = dialog([limitsMock()]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.cancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSaved).not.toHaveBeenCalled();
  });
});

describe('PodCancelDialog', () => {
  const impactMock = (over: Record<string, unknown> = {}, extra: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: HOST_POD_DELETE_IMPACT, variables: { pod_doc_id: 'pod-1' } },
      result: {
        data: {
          hostPodDeleteImpact: {
            __typename: 'PodDeleteImpact',
            other_attendee_count: 0,
            refundable_payment_count: 0,
            refund_total: 0,
            currency_symbol: '₹',
            ...over,
          },
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...extra,
    }) as MockedResponse;

  const deleteMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
    ({
      request: { query: HOST_DELETE_POD },
      variableMatcher: () => true,
      result: { data: { hostDeletePod: true } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const dialog = (mocks: readonly MockedResponse[], podId: string | null = 'pod-1') => {
    const props = {
      podId,
      podTitle: 'Sunday Badminton',
      onClose: vi.fn(),
      onCancelled: vi.fn(),
    };
    return { props, ...wrap(<PodCancelDialog {...props} />, mocks) };
  };

  const submit = async () => {
    fireEvent.submit(document.querySelector('#pod-cancel-form') as HTMLFormElement);
    await settle();
    await settle();
  };

  it('renders nothing when there is no pod', () => {
    dialog([], null);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('names the pod it is about to cancel', async () => {
    dialog([impactMock()]);
    await settle();

    expect(screen.getByText(labels.cancelIntro('Sunday Badminton'))).toBeInTheDocument();
  });

  it('waits on the impact before claiming who it affects', () => {
    dialog([impactMock()]);

    expect(document.body.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('says nobody else is affected on a pod with no other attendees', async () => {
    dialog([impactMock()]);
    await settle();

    expect(screen.getByText(labels.cancelNoOthers)).toBeInTheDocument();
  });

  // One sentence per row rather than fragments joined in JSX: a language that
  // orders the clause differently cannot be built by concatenation.
  it('names the refund it will start, and how many payments it covers', async () => {
    dialog([impactMock({ other_attendee_count: 3, refundable_payment_count: 2, refund_total: 900 })]);
    await settle();

    expect(screen.getByText(new RegExp(labels.cancelOthers(3)))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(labels.cancelRefund('₹900', 2)))).toBeInTheDocument();
  });

  it('says the audience is only emailed when there is nothing to refund', async () => {
    dialog([impactMock({ other_attendee_count: 3 })]);
    await settle();

    expect(screen.getByText(new RegExp(labels.cancelEmailOnly))).toBeInTheDocument();
  });

  it('states the reason when the impact could not be read', async () => {
    dialog([impactMock({}, { result: undefined, error: new Error('That pod no longer exists') })]);
    await settle();

    expect(screen.getByText('That pod no longer exists')).toBeInTheDocument();
  });

  it('will not cancel without a reason', async () => {
    const { props } = dialog([impactMock(), deleteMock()]);
    await settle();

    await submit();

    expect(screen.getByText(labels.reasonRequired)).toBeInTheDocument();
    expect(props.onCancelled).not.toHaveBeenCalled();
  });

  it('needs the words when the reason is Other, which says nothing on its own', async () => {
    const { props } = dialog([impactMock(), deleteMock()]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.reason)));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: labels.cancelReason('Other') }));
    await settle();

    await submit();

    expect(screen.getByText(labels.noteRequired)).toBeInTheDocument();
    expect(props.onCancelled).not.toHaveBeenCalled();
  });

  it('cancels the pod once a reason has been given', async () => {
    const variables: Record<string, unknown>[] = [];
    const { props } = dialog([
      impactMock(),
      deleteMock({
        variableMatcher: (v: Record<string, unknown>) => {
          variables.push(v);
          return true;
        },
      }),
    ]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.reason)));
    await settle();
    fireEvent.click(screen.getAllByRole('option')[0]);
    await settle();

    await submit();

    expect(props.onCancelled).toHaveBeenCalledTimes(1);
    // An empty note travels as null rather than as an empty string.
    expect(variables[0]).toMatchObject({ pod_doc_id: 'pod-1', reason_note: null });
  });

  it('states the server reason rather than reporting a cancellation it never made', async () => {
    const { props } = dialog([
      impactMock(),
      deleteMock({ result: undefined, error: new Error('That pod has already started') }),
    ]);
    await settle();

    fireEvent.mouseDown(screen.getByLabelText(new RegExp(labels.reason)));
    await settle();
    fireEvent.click(screen.getAllByRole('option')[0]);
    await settle();

    await submit();

    expect(screen.getByText('That pod has already started')).toBeInTheDocument();
    expect(props.onCancelled).not.toHaveBeenCalled();
  });

  // A cancel that refunds money is not the same button as one that does not.
  it('words the confirm as starting refunds when there are payments to return', async () => {
    dialog([impactMock({ other_attendee_count: 3, refundable_payment_count: 2, refund_total: 900 })]);
    await settle();

    expect(screen.getByRole('button', { name: labels.initiateRefunds })).toBeInTheDocument();
  });

  it('closes without cancelling anything', async () => {
    const { props } = dialog([impactMock()]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.keepPod }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCancelled).not.toHaveBeenCalled();
  });
});
