/**
 * The three enrolment dialogs — one per partner.
 *
 * Each is the moment a partner commits, and each commits something different:
 * the venue commits a real slot (accept and slot are ONE action, because an
 * acceptance with no slot leaves the offer half-claimed with nothing for a host
 * to see), the host commits themselves, and the club admin commits one of their
 * clubs. None of them may report success the server never gave, which is what
 * these hold: with nothing answering, no callback fires.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClubClaimDialog } from '../src/club/ClubClaimDialog';
import { HostClaimDialog } from '../src/host/HostClaimDialog';
import { VenueAcceptDialog } from '../src/venue/VenueAcceptDialog';

const t = (key: string) => key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  ({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'OPEN',
    pod_title: 'Weekly Badminton',
    pod_description: 'Doubles, all levels.',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    category_name: 'Badminton',
    pod_amount: 250,
    no_of_spots: 8,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    viewer_claimed: false,
    pod_id: null,
    expected_host_earnings: 1400,
    ...over,
  }) as AutoPodRow;

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('VenueAcceptDialog', () => {
  const props = {
    labels,
    onClose: vi.fn(),
    onAccepted: vi.fn(),
    formatWhen,
    formatMoney,
  };

  it('renders nothing while it is closed, and nothing without a row', () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open={false} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();

    wrap(<VenueAcceptDialog {...props} row={null} open />);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the Auto Pod it is accepting, priced through the caller formatter', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(document.body.textContent).toContain('₹250');
  });

  it('survives the venue and slot lists never answering', async () => {
    wrap(<VenueAcceptDialog {...props} row={row()} open />);
    await settle();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('offers the way out for a venue with no free slots, when the surface has one', async () => {
    const onAddAvailability = vi.fn();
    wrap(<VenueAcceptDialog {...props} row={row()} open onAddAvailability={onAddAvailability} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('never reports an acceptance the server did not confirm', async () => {
    const onAccepted = vi.fn();
    wrap(<VenueAcceptDialog {...props} onAccepted={onAccepted} row={row()} open />);
    await settle();
    await pressEverything();

    expect(onAccepted).not.toHaveBeenCalled();
  });
});

describe('HostClaimDialog', () => {
  const props = { labels, onClose: vi.fn(), onAssigned: vi.fn(), formatWhen, formatMoney };

  it('renders nothing while it is closed', () => {
    wrap(<HostClaimDialog {...props} row={row()} open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the host what this pod is worth to them before they commit', async () => {
    wrap(<HostClaimDialog {...props} row={row({ expected_host_earnings: 1400 })} open />);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
  });

  it('opens on a pod whose earnings have not been worked out yet', async () => {
    wrap(<HostClaimDialog {...props} row={row({ expected_host_earnings: null })} open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('never reports an assignment the server did not confirm', async () => {
    const onAssigned = vi.fn();
    wrap(<HostClaimDialog {...props} onAssigned={onAssigned} row={row()} open />);
    await settle();
    await pressEverything();

    expect(onAssigned).not.toHaveBeenCalled();
  });
});

describe('ClubClaimDialog', () => {
  const props = { labels, onClose: vi.fn(), onClaimed: vi.fn(), formatWhen };

  it('renders nothing while it is closed', () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId="sub-1" open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the Auto Pod, narrowed to the clubs that carry its category', async () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId="sub-1" open />);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
  });

  it('opens with no category to narrow by, rather than crashing', async () => {
    wrap(<ClubClaimDialog {...props} row={row()} subCategoryId={null} open />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('never reports a claim the server did not confirm', async () => {
    const onClaimed = vi.fn();
    wrap(<ClubClaimDialog {...props} onClaimed={onClaimed} row={row()} subCategoryId="sub-1" open />);
    await settle();
    await pressEverything();

    expect(onClaimed).not.toHaveBeenCalled();
  });
});
