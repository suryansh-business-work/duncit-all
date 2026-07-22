import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PodEditForm, {
  HOST_UPDATE_POD,
  podEditSchema,
  buildHostUpdateInput,
  podEditInitialValues,
} from '../pod-edit.form';
import { blankPodEditValues, type HostPodSummary } from '../pod-edit.types';

const pod: HostPodSummary = {
  id: 'pod-1',
  pod_title: 'Coffee tasting',
  pod_description: 'A cozy afternoon of specialty coffee tasting.',
  pod_images_and_videos: [
    { url: 'https://cdn.example/a.jpg', type: 'IMAGE' },
    { url: 'https://cdn.example/clip.mp4', type: 'VIDEO' },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pod-edit pure helpers', () => {
  it('podEditInitialValues returns blank values for a null pod', () => {
    expect(podEditInitialValues(null)).toEqual(blankPodEditValues);
  });

  it('podEditInitialValues prefills from a pod, joining media URLs', () => {
    expect(podEditInitialValues(pod)).toEqual({
      pod_title: 'Coffee tasting',
      pod_description: 'A cozy afternoon of specialty coffee tasting.',
      media_text: 'https://cdn.example/a.jpg\nhttps://cdn.example/clip.mp4',
    });
  });

  it('podEditInitialValues falls back to empty strings for missing fields', () => {
    expect(
      podEditInitialValues({ id: 'p2', pod_title: '' } as HostPodSummary),
    ).toEqual({ pod_title: '', pod_description: '', media_text: '' });
  });

  it('buildHostUpdateInput trims text and classifies video vs image URLs', () => {
    const input = buildHostUpdateInput({
      pod_title: '  Title  ',
      pod_description: '  Desc  ',
      media_text: 'https://cdn.example/a.jpg\n  \nhttps://cdn.example/clip.mov',
    });
    expect(input).toEqual({
      pod_title: 'Title',
      pod_description: 'Desc',
      pod_images_and_videos: [
        { url: 'https://cdn.example/a.jpg', type: 'IMAGE' },
        { url: 'https://cdn.example/clip.mov', type: 'VIDEO' },
      ],
    });
  });

  it('podEditSchema rejects short titles / descriptions and image-less media', () => {
    const bad = podEditSchema.safeParse({ pod_title: 'ab', pod_description: 'x', media_text: '' });
    expect(bad.success).toBe(false);
  });

  it('podEditSchema accepts valid values', () => {
    const ok = podEditSchema.safeParse({
      pod_title: 'Valid title',
      pod_description: 'A sufficiently long description.',
      media_text: 'https://cdn.example/a.jpg',
    });
    expect(ok.success).toBe(true);
  });

  it('podEditSchema rejects media_text with only a video URL (no image)', () => {
    const res = podEditSchema.safeParse({
      pod_title: 'Valid title',
      pod_description: 'A sufficiently long description.',
      media_text: 'https://cdn.example/clip.mp4',
    });
    expect(res.success).toBe(false);
  });
});

describe('PodEditForm', () => {
  it('renders nothing meaningful (closed) when pod is null', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodEditForm pod={null} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.queryByText('Edit pod')).not.toBeInTheDocument();
  });

  it('renders the dialog prefilled and calls onClose from Cancel', () => {
    const onClose = vi.fn();
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodEditForm pod={pod} onClose={onClose} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.getByText('Edit pod')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coffee tasting')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors on submit when fields are cleared', async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <PodEditForm pod={pod} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    fireEvent.change(screen.getByDisplayValue('Coffee tasting'), { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Title is too short')).toBeInTheDocument();
  });

  it('submits a successful mutation and calls onSaved', async () => {
    const onSaved = vi.fn();
    const mocks = [
      {
        request: {
          query: HOST_UPDATE_POD,
          variables: {
            pod_doc_id: 'pod-1',
            input: buildHostUpdateInput(podEditInitialValues(pod)),
          },
        },
        result: {
          data: {
            hostUpdatePod: {
              id: 'pod-1',
              pod_title: 'Coffee tasting',
              pod_description: 'A cozy afternoon of specialty coffee tasting.',
              pod_images_and_videos: [{ url: 'https://cdn.example/a.jpg', type: 'IMAGE' }],
            },
          },
        },
      },
    ];
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <PodEditForm pod={pod} onClose={vi.fn()} onSaved={onSaved} />
      </MockedProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('surfaces the mutation error in an alert', async () => {
    // The component awaits save() inside RHF's handleSubmit and renders
    // saveState.error instead of catching the rejection, so it floats as an
    // unhandled rejection. Detach vitest's listeners, swallow the single
    // expected rejection, then restore them.
    const priorListeners = process.listeners('unhandledRejection');
    priorListeners.forEach((l) => process.off('unhandledRejection', l));
    const swallow = (reason: unknown) => {
      if (!(reason instanceof Error) || reason.message !== 'Update failed') {
        priorListeners.forEach((l) => (l as (r: unknown) => void)(reason));
      }
    };
    process.on('unhandledRejection', swallow);
    const mocks = [
      {
        request: {
          query: HOST_UPDATE_POD,
          variables: {
            pod_doc_id: 'pod-1',
            input: buildHostUpdateInput(podEditInitialValues(pod)),
          },
        },
        error: new Error('Update failed'),
      },
    ];
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <PodEditForm pod={pod} onClose={vi.fn()} onSaved={vi.fn()} />
      </MockedProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Update failed')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', swallow);
    priorListeners.forEach((l) => process.on('unhandledRejection', l));
  });
});
