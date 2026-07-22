import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import PodResubmitForm, {
  RESUBMIT_VENUES,
  RESUBMIT_VENUE_SLOTS,
  HOST_RESUBMIT_POD,
  podResubmitSchema,
  buildHostResubmitInput,
  podResubmitInitialValues,
  slotOptionLabel,
} from '../pod-resubmit.form';
import type { HostPodForResubmit } from '../pod-resubmit.types';

const pod: HostPodForResubmit = {
  id: 'pod1',
  pod_title: 'My Pod',
  pod_description: 'A nice long description here',
  pod_images_and_videos: [
    { url: 'https://x.com/a.jpg', type: 'IMAGE' },
    { url: 'https://x.com/b.mp4', type: 'VIDEO' },
  ],
  venue_id: 'v0',
};

const venuesMock = {
  request: { query: RESUBMIT_VENUES },
  result: {
    data: {
      publicVenues: [
        { id: 'v1', venue_name: 'Alpha Hall', city: 'Delhi' },
        { id: 'v2', venue_name: 'Beta Room', city: null },
      ],
    },
  },
};

const slotsMock = {
  request: { query: RESUBMIT_VENUE_SLOTS, variables: { venue_id: 'v1' } },
  result: {
    data: {
      venueAvailableSlots: [
        {
          id: 's1',
          start_at: '2026-03-05T12:30:00.000Z',
          end_at: '2026-03-05T14:30:00.000Z',
          price: 400,
          space_label: 'Hall A',
        },
      ],
    },
  },
};

describe('pure helpers', () => {
  it('buildHostResubmitInput trims + classifies media types', () => {
    const out = buildHostResubmitInput({
      pod_title: '  Title  ',
      pod_description: '  Desc  ',
      media_text: 'https://x/a.jpg\n  \nhttps://x/clip.mov',
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
    expect(out.pod_title).toBe('Title');
    expect(out.pod_description).toBe('Desc');
    expect(out.pod_images_and_videos).toEqual([
      { url: 'https://x/a.jpg', type: 'IMAGE' },
      { url: 'https://x/clip.mov', type: 'VIDEO' },
    ]);
    expect(out.venue_id).toBe('v1');
    expect(out.venue_slot_id).toBe('s1');
  });

  it('podResubmitInitialValues returns blanks for null', () => {
    expect(podResubmitInitialValues(null).pod_title).toBe('');
    expect(podResubmitInitialValues(null).media_text).toBe('');
  });

  it('podResubmitInitialValues prefills from pod, clearing venue/slot', () => {
    const v = podResubmitInitialValues(pod);
    expect(v.pod_title).toBe('My Pod');
    expect(v.pod_description).toBe('A nice long description here');
    expect(v.media_text).toBe('https://x.com/a.jpg\nhttps://x.com/b.mp4');
    expect(v.venue_id).toBe('');
    expect(v.venue_slot_id).toBe('');
  });

  it('podResubmitInitialValues handles missing optional fields', () => {
    const v = podResubmitInitialValues({ id: 'p', pod_title: 'T' });
    expect(v.pod_description).toBe('');
    expect(v.media_text).toBe('');
  });

  it('slotOptionLabel renders day/time, plus optional space + price', () => {
    const label = slotOptionLabel({
      id: 's1',
      start_at: '2026-03-05T12:30:00.000Z',
      end_at: '2026-03-05T14:30:00.000Z',
      price: 400,
      space_label: 'Hall A',
    });
    expect(label).toContain('Hall A');
    expect(label).toContain('₹400');
    expect(label).toContain('–');
  });

  it('slotOptionLabel omits space + price when absent/zero', () => {
    const label = slotOptionLabel({
      id: 's2',
      start_at: '2026-03-05T12:30:00.000Z',
      end_at: '2026-03-05T14:30:00.000Z',
      price: 0,
      space_label: '',
    });
    expect(label).not.toContain('₹');
    expect(label).not.toContain('·');
  });

  it('podResubmitSchema rejects short title & missing media', async () => {
    const res = await podResubmitSchema.safeParseAsync({
      pod_title: 'ab',
      pod_description: 'short',
      media_text: 'no image here',
      venue_id: '',
      venue_slot_id: '',
    });
    expect(res.success).toBe(false);
  });

  it('podResubmitSchema accepts a valid payload', async () => {
    const res = await podResubmitSchema.safeParseAsync({
      pod_title: 'Valid title',
      pod_description: 'A description long enough',
      media_text: 'https://x/a.jpg',
      venue_id: 'v1',
      venue_slot_id: 's1',
    });
    expect(res.success).toBe(true);
  });
});

describe('PodResubmitForm', () => {
  it('renders nothing (closed dialog) when pod is null', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodResubmitForm pod={null} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.queryByText('Edit & resubmit pod')).not.toBeInTheDocument();
  });

  it('renders prefilled fields and venue options', async () => {
    render(
      <MockedProvider mocks={[venuesMock]} addTypename={false}>
        <PodResubmitForm pod={pod} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.getByText('Edit & resubmit pod')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Pod')).toBeInTheDocument();
    // Slot picker starts disabled with the "select a venue first" helper.
    expect(screen.getByText('Select a venue first')).toBeInTheDocument();
  });

  it('cancel button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <MockedProvider mocks={[venuesMock]} addTypename={false}>
        <PodResubmitForm pod={pod} onClose={onClose} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('selecting a venue loads its slots then submits successfully', async () => {
    const onSaved = vi.fn();
    const resubmitMock = {
      request: {
        query: HOST_RESUBMIT_POD,
        variables: {
          pod_doc_id: 'pod1',
          input: {
            pod_title: 'My Pod',
            pod_description: 'A nice long description here',
            pod_images_and_videos: [
              { url: 'https://x.com/a.jpg', type: 'IMAGE' },
              { url: 'https://x.com/b.mp4', type: 'VIDEO' },
            ],
            venue_id: 'v1',
            venue_slot_id: 's1',
          },
        },
      },
      result: {
        data: {
          hostResubmitPod: {
            id: 'pod1',
            pod_title: 'My Pod',
            venue_approval_status: 'PENDING',
            is_active: true,
          },
        },
      },
    };

    render(
      <MockedProvider mocks={[venuesMock, slotsMock, resubmitMock]} addTypename={false}>
        <PodResubmitForm pod={pod} onClose={vi.fn()} onSaved={onSaved} />
      </MockedProvider>,
    );

    // Wait for venues to load, then pick one via the MUI select.
    const venueSelect = await screen.findByRole('combobox', { name: /Venue/i });
    fireEvent.mouseDown(venueSelect);
    fireEvent.click(await screen.findByText(/Alpha Hall/));

    // Slot select becomes enabled after the slots query; open it and pick.
    const slotSelect = screen.getByRole('combobox', { name: /Time slot/i });
    await waitFor(() => expect(slotSelect).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(slotSelect);
    fireEvent.click(await screen.findByText(/Hall A/));

    fireEvent.click(screen.getByRole('button', { name: /Resubmit request/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('surfaces a mutation error and keeps the dialog open', async () => {
    // The component intentionally does not catch the rejected mutation promise
    // (it renders resubmitState.error instead). That floats as an unhandled
    // rejection, which vitest would flag — detach its listeners for this test
    // and swallow the single expected rejection, then restore them.
    const priorListeners = process.listeners('unhandledRejection');
    priorListeners.forEach((l) => process.off('unhandledRejection', l));
    const swallow = (reason: unknown) => {
      if (!(reason instanceof Error) || reason.message !== 'Slot no longer available') {
        priorListeners.forEach((l) => (l as (r: unknown) => void)(reason));
      }
    };
    process.on('unhandledRejection', swallow);

    const errMock = {
      request: {
        query: HOST_RESUBMIT_POD,
        variables: {
          pod_doc_id: 'pod1',
          input: {
            pod_title: 'My Pod',
            pod_description: 'A nice long description here',
            pod_images_and_videos: [
              { url: 'https://x.com/a.jpg', type: 'IMAGE' },
              { url: 'https://x.com/b.mp4', type: 'VIDEO' },
            ],
            venue_id: 'v1',
            venue_slot_id: 's1',
          },
        },
      },
      error: new Error('Slot no longer available'),
    };

    render(
      <MockedProvider mocks={[venuesMock, slotsMock, errMock]} addTypename={false}>
        <PodResubmitForm pod={pod} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );

    const venueSelect = await screen.findByRole('combobox', { name: /Venue/i });
    fireEvent.mouseDown(venueSelect);
    fireEvent.click(await screen.findByText(/Alpha Hall/));
    const slotSelect = screen.getByRole('combobox', { name: /Time slot/i });
    await waitFor(() => expect(slotSelect).not.toHaveAttribute('aria-disabled', 'true'));
    fireEvent.mouseDown(slotSelect);
    fireEvent.click(await screen.findByText(/Hall A/));
    fireEvent.click(screen.getByRole('button', { name: /Resubmit request/i }));

    expect(await screen.findByText('Slot no longer available')).toBeInTheDocument();
    // Let the microtask queue flush so the rejection is swallowed, then restore.
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', swallow);
    priorListeners.forEach((l) => process.on('unhandledRejection', l));
  });
});
