import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  PodResubmitForm,
  buildHostResubmitInput,
  HOST_RESUBMIT_POD,
  podResubmitInitialValues,
  podResubmitSchema,
  slotOptionLabel,
  blankPodResubmitValues,
} from '../index';
import type {
  HostPodForResubmit,
  PodResubmitValues,
  ResubmitSlotOption,
  ResubmitVenueOption,
} from '../index';

const pod: HostPodForResubmit = {
  id: 'pod1',
  pod_title: 'Barrel Pod',
  pod_description: 'A nice long description here',
  pod_images_and_videos: [{ url: 'https://x.com/a.jpg', type: 'IMAGE' }],
  venue_id: 'v0',
};

describe('pod-resubmit barrel (index)', () => {
  it('re-exports the mutation document', () => {
    expect(HOST_RESUBMIT_POD).toBeDefined();
    expect(HOST_RESUBMIT_POD.kind).toBe('Document');
  });

  it('re-exports blank + initial value helpers', () => {
    expect(blankPodResubmitValues.pod_title).toBe('');
    expect(podResubmitInitialValues(null)).toEqual(blankPodResubmitValues);
    const filled: PodResubmitValues = podResubmitInitialValues(pod);
    expect(filled.pod_title).toBe('Barrel Pod');
    expect(filled.media_text).toBe('https://x.com/a.jpg');
    expect(filled.venue_id).toBe('');
  });

  it('re-exports buildHostResubmitInput', () => {
    const out = buildHostResubmitInput({
      pod_title: ' T ',
      pod_description: ' D ',
      media_text: 'https://x/a.jpg\nhttps://x/c.mp4',
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
    expect(out.pod_title).toBe('T');
    expect(out.pod_images_and_videos).toEqual([
      { url: 'https://x/a.jpg', type: 'IMAGE' },
      { url: 'https://x/c.mp4', type: 'VIDEO' },
    ]);
  });

  it('re-exports slotOptionLabel', () => {
    const slot: ResubmitSlotOption = {
      id: 's1',
      start_at: '2026-03-05T12:30:00.000Z',
      end_at: '2026-03-05T14:30:00.000Z',
      price: 400,
      space_label: 'Hall A',
    };
    expect(slotOptionLabel(slot)).toContain('Hall A');
  });

  it('re-exports the zod schema', async () => {
    const res = await podResubmitSchema.safeParseAsync({
      pod_title: 'Valid title',
      pod_description: 'A description long enough',
      media_text: 'https://x/a.jpg',
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
    expect(res.success).toBe(true);
  });

  it('re-exports a working PodResubmitForm component', () => {
    const venue: ResubmitVenueOption = { id: 'v1', venue_name: 'Alpha', city: 'Delhi' };
    expect(venue.venue_name).toBe('Alpha');
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodResubmitForm pod={pod} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.getByText('Edit & resubmit pod')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Barrel Pod')).toBeInTheDocument();
  });

  it('PodResubmitForm renders nothing when pod is null', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodResubmitForm pod={null} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.queryByText('Edit & resubmit pod')).not.toBeInTheDocument();
  });
});
