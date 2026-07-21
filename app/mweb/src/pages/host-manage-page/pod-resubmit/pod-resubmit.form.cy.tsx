import { describe, expect, it } from 'vitest';
import {
  buildHostResubmitInput,
  podResubmitInitialValues,
  podResubmitSchema,
  slotOptionLabel,
} from './pod-resubmit.form';
import { blankPodResubmitValues, type ResubmitSlotOption } from './pod-resubmit.types';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from '../venueApproval';

const valid = {
  pod_title: 'Poetry evening',
  pod_description: 'An evening of poetry and calm conversation',
  media_text: 'https://img/pod.jpg',
  venue_id: 'v1',
  venue_slot_id: 's1',
};

describe('podResubmitSchema', () => {
  it('accepts a complete resubmission', () => {
    expect(podResubmitSchema.safeParse(valid).success).toBe(true);
  });

  it('requires title, description, an image, a venue and a slot', () => {
    expect(podResubmitSchema.safeParse({ ...valid, pod_title: 'ab' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, pod_description: 'short' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, media_text: 'https://v/clip.mp4' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, venue_id: '' }).success).toBe(false);
    expect(podResubmitSchema.safeParse({ ...valid, venue_slot_id: '' }).success).toBe(false);
  });
});

describe('buildHostResubmitInput', () => {
  it('maps values onto HostResubmitPodInput with typed media', () => {
    const input = buildHostResubmitInput({
      ...valid,
      media_text: ' https://img/a.jpg \nhttps://v/clip.mp4\n\n',
    });
    expect(input).toEqual({
      pod_title: 'Poetry evening',
      pod_description: 'An evening of poetry and calm conversation',
      pod_images_and_videos: [
        { url: 'https://img/a.jpg', type: 'IMAGE' },
        { url: 'https://v/clip.mp4', type: 'VIDEO' },
      ],
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
  });
});

describe('podResubmitInitialValues', () => {
  it('prefills the details but always demands a fresh venue + slot', () => {
    const values = podResubmitInitialValues({
      id: 'p1',
      pod_title: 'Poetry evening',
      pod_description: 'Desc long enough here',
      pod_images_and_videos: [{ url: 'https://img/a.jpg', type: 'IMAGE' }],
      venue_id: 'old-venue',
    });
    expect(values.pod_title).toBe('Poetry evening');
    expect(values.media_text).toBe('https://img/a.jpg');
    expect(values.venue_id).toBe(''); // the rejected venue is never pre-picked
    expect(values.venue_slot_id).toBe('');
  });

  it('falls back to blanks without a pod', () => {
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
  });
});

describe('slotOptionLabel', () => {
  const slot: ResubmitSlotOption = {
    id: 's1',
    start_at: '2030-03-05T12:30:00.000Z',
    end_at: '2030-03-05T14:30:00.000Z',
    price: 400,
    space_label: 'Hall A',
  };

  it('joins day, window, space and price', () => {
    const label = slotOptionLabel(slot);
    expect(label).toContain('Hall A');
    expect(label).toContain('₹400');
    expect(label).toContain('–');
  });

  it('omits the space and price when absent/free', () => {
    const label = slotOptionLabel({ ...slot, price: 0, space_label: '' });
    expect(label).not.toContain('·');
  });
});

describe('venueApproval helpers', () => {
  it('maps DECLINED/PENDING to chips and everything else to none', () => {
    expect(venueApprovalChip('DECLINED')).toEqual({ label: 'Venue Rejected', color: 'error' });
    expect(venueApprovalChip('PENDING')).toEqual({ label: 'Venue Approval Pending', color: 'warning' });
    expect(venueApprovalChip('APPROVED')).toBeNull();
    expect(venueApprovalChip(null)).toBeNull();
  });

  it('flags only DECLINED pods as venue-rejected and carries the spec note', () => {
    expect(isVenueRejected('DECLINED')).toBe(true);
    expect(isVenueRejected('PENDING')).toBe(false);
    expect(VENUE_REJECTED_NOTE).toContain('Venue rejected your slot request');
  });
});
