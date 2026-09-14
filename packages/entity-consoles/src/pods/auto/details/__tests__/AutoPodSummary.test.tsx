import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { shellAutoPodLabels } from '@duncit/utils';
import { bengaluru, echoT, formatDateTime, makeDetailsRow, venueClaim } from '../../__tests__/fixtures';
import type { AutoPodDetailsRow } from '../../queries';
import AutoPodSummary from '../AutoPodSummary';

const labels = shellAutoPodLabels(echoT);
const PENDING = 'admin.autoPods.summaryMeetingPending';

const renderSummary = (row: AutoPodDetailsRow) =>
  render(<AutoPodSummary row={row} t={echoT} labels={labels} formatDateTime={formatDateTime} />);

/** The value drawn under a summary label, or null when the row is not drawn. */
const valueOf = (label: string) => screen.queryByText(label)?.nextElementSibling?.textContent ?? null;

describe('AutoPodSummary / a priced physical offer', () => {
  it('reads back the category, mode, city, price, spots, date and the template copy', () => {
    renderSummary(
      makeDetailsRow({ location: bengaluru, pod_date_time: '2026-09-20T07:00:00.000Z', venue_claim: venueClaim }),
    );
    expect(screen.getByText('admin.autoPods.summaryTitle')).toBeInTheDocument();
    expect(valueOf('admin.autoPods.colCategory')).toBe('Sports › Racket › Badminton');
    expect(valueOf('admin.autoPods.colMode')).toBe(labels.modePhysical);
    expect(valueOf('admin.autoPods.colLocation')).toBe('Bengaluru, Karnataka');
    expect(valueOf(labels.priceLabel)).toBe('₹499');
    expect(valueOf(labels.spotsLabel)).toBe('12');
    // The template's own date wins over the slot the venue enrolled with.
    expect(valueOf('admin.autoPods.summaryWhen')).toBe('FMT<2026-09-20T07:00:00.000Z>');
    expect(valueOf('admin.autoPods.summaryDescription')).toBe('Friendly doubles for intermediate players.');
    expect(valueOf('admin.autoPods.summaryInfo')).toBe('Bring non-marking shoes.');
    expect(valueOf('admin.autoPods.summaryHashtags')).toBe('badmintonweekend');
    expect(valueOf('admin.autoPods.summaryOffers')).toBe('Shuttles provided');
    expect(valueOf('admin.autoPods.summaryPerks')).toBe('Free water');
    expect(valueOf('admin.autoPods.summaryMedia')).toBe('admin.autoPods.summaryMediaCount(1)');
  });

  it('draws no meeting row for a physical offer and no cancel reason while none was given', () => {
    renderSummary(makeDetailsRow());
    expect(screen.queryByText('admin.autoPods.summaryMeeting')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.autoPods.summaryCancelReason')).not.toBeInTheDocument();
  });

  it('dates the offer by the enrolled venue slot when the template carries no date', () => {
    renderSummary(makeDetailsRow({ venue_claim: venueClaim }));
    expect(valueOf('admin.autoPods.summaryWhen')).toBe('FMT<2026-09-20T07:00:00.000Z>');
  });
});

describe('AutoPodSummary / a bare virtual offer', () => {
  const bare = makeDetailsRow({
    pod_mode: 'VIRTUAL',
    category_path: [],
    pod_amount: 0,
    no_of_spots: 0,
    pod_description: '',
    pod_info: '',
    pod_hashtag: [],
    what_this_pod_offers: [],
    available_perks: [],
    pod_images_and_videos: [],
    cancel_reason: 'Host withdrew before the pod went live',
  });

  it('dashes what the template leaves blank and says who fills in the rest', () => {
    renderSummary(bare);
    expect(valueOf('admin.autoPods.colCategory')).toBe('—');
    expect(valueOf('admin.autoPods.colMode')).toBe(labels.modeVirtual);
    expect(valueOf('admin.autoPods.colLocation')).toBe('admin.autoPods.anyCity');
    expect(valueOf(labels.priceLabel)).toBe(labels.pricedByHost);
    expect(valueOf(labels.spotsLabel)).toBe(labels.pricedByHost);
    expect(valueOf('admin.autoPods.summaryWhen')).toBe(PENDING);
    expect(valueOf('admin.autoPods.summaryDescription')).toBe('—');
    expect(valueOf('admin.autoPods.summaryInfo')).toBe('—');
    expect(valueOf('admin.autoPods.summaryHashtags')).toBe('—');
    expect(valueOf('admin.autoPods.summaryOffers')).toBe('—');
    expect(valueOf('admin.autoPods.summaryPerks')).toBe('—');
    expect(valueOf('admin.autoPods.summaryMedia')).toBe('admin.autoPods.summaryMediaCount(0)');
  });

  it('says the host sets the meeting while no link exists, and shows the cancel reason', () => {
    renderSummary(bare);
    expect(valueOf('admin.autoPods.summaryMeeting')).toBe(PENDING);
    expect(valueOf('admin.autoPods.summaryCancelReason')).toBe('Host withdrew before the pod went live');
  });

  it('shows the meeting platform beside its link once a host has set them', () => {
    renderSummary({ ...bare, meeting_platform: 'Google Meet', meeting_url: 'https://meet.google.com/dun-4821' });
    expect(valueOf('admin.autoPods.summaryMeeting')).toBe('Google Meet · https://meet.google.com/dun-4821');
  });

  it('shows the link alone when no platform was named', () => {
    renderSummary({ ...bare, meeting_url: 'https://zoom.us/j/4821' });
    expect(valueOf('admin.autoPods.summaryMeeting')).toBe('https://zoom.us/j/4821');
  });
});
