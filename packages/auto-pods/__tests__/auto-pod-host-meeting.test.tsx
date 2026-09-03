/**
 * What a host brings to a VIRTUAL offer when they assign themselves: the
 * meeting link and the window. The template carries none of it — there is no
 * venue to fix a virtual pod's date — so the host's claim dialog collects it,
 * and the claim waits until `autoPodHostMeetingReady` says it holds. A
 * physical offer never asks and never sends a meeting.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoPodCard } from '../src/AutoPodCard';
import { HostClaimDialog } from '../src/host/HostClaimDialog';
import { BLANK_HOST_MEETING, HostMeetingFields, hostMeetingInput } from '../src/host/HostMeetingFields';
import { AUTO_POD_HOST_PROJECTION, HOST_ASSIGN_AUTO_POD } from '../src/queries';

// MUI X wants a LocalizationProvider and a real calendar; a plain input that
// hands back a Date is all the dialog's logic reads.
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange, minDateTime }: any) => (
    <input
      aria-label={label}
      data-min={minDateTime ? new Date(minDateTime).toISOString() : ''}
      value={value ? new Date(value).toISOString() : ''}
      onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)}
    />
  ),
}));

const t = (key: string) => key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();
const HOUR = 3_600_000;

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  (({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'OPEN',
    pod_title: 'Evening Chess Online',
    pod_description: 'Rapid games, all levels.',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    category_name: 'Chess',
    pod_mode: 'VIRTUAL',
    pod_amount: 0,
    no_of_spots: 0,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    pod_id: null,
    expected_host_earnings: null,
    ...over,
  }) as AutoPodRow);

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

/**
 * A required MUI field's accessible name carries the asterisk MUI appends
 * ("Meeting link *"), so every lookup here matches on the label as a
 * substring rather than exactly.
 */
const field = (label: string) => screen.getByLabelText(label, { exact: false });

const type = async (label: string, value: string) => {
  fireEvent.change(field(label), { target: { value } });
  await settle();
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('hostMeetingInput', () => {
  it('sends nothing typed as nulls and blanks, and dates as ISO strings', () => {
    expect(hostMeetingInput(BLANK_HOST_MEETING)).toEqual({
      meeting_platform: null,
      meeting_url: '',
      pod_date_time: '',
      pod_end_date_time: '',
    });
    const start = new Date('2026-09-20T13:00:00.000Z');
    const end = new Date('2026-09-20T14:00:00.000Z');
    expect(
      hostMeetingInput({
        meeting_platform: 'GOOGLE_MEET',
        meeting_url: ' https://meet.google.com/abc-defg ',
        pod_date_time: start,
        pod_end_date_time: end,
      })
    ).toEqual({
      meeting_platform: 'GOOGLE_MEET',
      meeting_url: 'https://meet.google.com/abc-defg',
      pod_date_time: start.toISOString(),
      pod_end_date_time: end.toISOString(),
    });
  });
});

describe('HostMeetingFields', () => {
  const now = new Date('2026-09-10T09:00:00.000Z');

  it('hands every change back merged, and opens the end picker after the start once one is set', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ThemeProvider theme={testTheme}>
        <HostMeetingFields value={BLANK_HOST_MEETING} onChange={onChange} labels={labels} now={now} />
      </ThemeProvider>
    );
    expect(screen.getByText(labels.meetingHint)).toBeInTheDocument();
    // No start yet: the end may not be before now.
    expect(field(labels.meetingEnd)).toHaveAttribute('data-min', now.toISOString());

    await type(labels.meetingLink, 'https://meet.google.com/abc-defg');
    expect(onChange).toHaveBeenLastCalledWith({ ...BLANK_HOST_MEETING, meeting_url: 'https://meet.google.com/abc-defg' });

    const start = new Date(now.getTime() + 24 * HOUR);
    await type(labels.meetingStart, start.toISOString());
    expect(onChange).toHaveBeenLastCalledWith({ ...BLANK_HOST_MEETING, pod_date_time: start });

    fireEvent.mouseDown(field(labels.meetingPlatform));
    await settle();
    fireEvent.click(await screen.findByRole('option', { name: labels.meetingPlatformOther }));
    await settle();
    expect(onChange).toHaveBeenLastCalledWith({ ...BLANK_HOST_MEETING, meeting_platform: 'OTHER' });

    // A future start moves the end picker's floor to it; a past one does not.
    rerender(
      <ThemeProvider theme={testTheme}>
        <HostMeetingFields
          value={{ ...BLANK_HOST_MEETING, pod_date_time: start }}
          onChange={onChange}
          labels={labels}
          now={now}
        />
      </ThemeProvider>
    );
    expect(field(labels.meetingEnd)).toHaveAttribute('data-min', start.toISOString());
    rerender(
      <ThemeProvider theme={testTheme}>
        <HostMeetingFields
          value={{ ...BLANK_HOST_MEETING, pod_date_time: new Date(now.getTime() - HOUR) }}
          onChange={onChange}
          labels={labels}
          now={now}
        />
      </ThemeProvider>
    );
    expect(field(labels.meetingEnd)).toHaveAttribute('data-min', now.toISOString());
    await type(labels.meetingEnd, '');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pod_end_date_time: null }));
  });
});

describe('HostClaimDialog on a virtual offer', () => {
  const props = {
    labels,
    onClose: vi.fn(),
    onAssigned: vi.fn(),
    formatWhen,
    formatMoney,
    locationId: 'loc-blr',
    locationLabel: 'Bengaluru, Karnataka',
  };
  const start = new Date(Date.now() + 48 * HOUR);
  const end = new Date(start.getTime() + HOUR);

  const projectionMock = (): MockedResponse => ({
    request: {
      query: AUTO_POD_HOST_PROJECTION,
      variables: { auto_pod_doc_id: 'ap-1', pod_amount: 300, no_of_spots: 6 },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        autoPodHostProjection: {
          __typename: 'AutoPodHostProjection',
          min_spots: 2,
          max_spots: 20,
          pod_amount: 300,
          no_of_spots: 6,
          total_collection: 1500,
          gst_amount: 229,
          platform_fee_amount: 75,
          venue_amount: 0,
          club_admin_amount: 100,
          host_receives: 1096,
          viable: true,
        },
      },
    },
  });

  const assignMock = (): MockedResponse => ({
    request: {
      query: HOST_ASSIGN_AUTO_POD,
      variables: {
        auto_pod_doc_id: 'ap-1',
        location_id: 'loc-blr',
        pod_amount: 300,
        no_of_spots: 6,
        meeting: {
          meeting_platform: null,
          meeting_url: 'https://meet.google.com/abc-defg',
          pod_date_time: start.toISOString(),
          pod_end_date_time: end.toISOString(),
        },
      },
    },
    result: { data: { hostAssignAutoPod: null } },
  });

  it('asks for the meeting, holds the button until it is complete, then sends it with the claim', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />, [projectionMock(), assignMock()]);
    await settle();
    expect(screen.getByTestId('auto-pod-host-meeting')).toBeInTheDocument();

    // Priced, but no meeting yet: the claim waits.
    await type(labels.ticketPrice, '300');
    await type(labels.spotsField, '6');
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeDisabled();

    await type(labels.meetingLink, 'https://meet.google.com/abc-defg');
    await type(labels.meetingStart, start.toISOString());
    await type(labels.meetingEnd, end.toISOString());
    expect(screen.getByRole('button', { name: labels.assignMyselfCta })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: labels.assignMyselfCta }));
    await settle();
    await settle();
    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it('never asks a physical offer for a meeting', async () => {
    wrap(<HostClaimDialog {...props} row={row({ pod_mode: 'PHYSICAL' })} open />);
    await settle();
    expect(screen.queryByTestId('auto-pod-host-meeting')).toBeNull();
  });
});

describe('AutoPodCard mode and price', () => {
  it('wears its mode, and says who prices it until a host has', () => {
    const { container } = render(
      <AutoPodCard row={row()} labels={labels} formatWhen={formatWhen} formatMoney={formatMoney} />
    );
    expect(screen.getByTestId('auto-pod-mode-tag')).toHaveTextContent(labels.modeVirtual);
    expect(screen.getByTestId('auto-pod-priced-by-host')).toHaveTextContent(labels.pricedByHost);
    expect(container.textContent).not.toContain('₹');
  });

  it('shows the price and spots once a host has set them, on a physical offer', () => {
    render(
      <AutoPodCard
        row={row({ pod_mode: 'PHYSICAL', pod_amount: 499, no_of_spots: 8 })}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    );
    expect(screen.getByTestId('auto-pod-mode-tag')).toHaveTextContent(labels.modePhysical);
    expect(screen.queryByTestId('auto-pod-priced-by-host')).toBeNull();
    expect(screen.getByText(`${labels.priceLabel}: ₹499`)).toBeInTheDocument();
  });
});
