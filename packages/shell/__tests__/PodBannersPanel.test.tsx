/**
 * Banners — a partner's upcoming pods with Make banners. What matters: the
 * pods are the partner's own, soonest first; nothing is asked before the
 * partner is known; Make banners sends the pod and shows each slide with a
 * download link; a refusal is shown on the pod and logged, never swallowed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  generate: vi.fn(),
  notifySuccess: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({ useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: string) => `on ${value}` }),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: h.notifySuccess,
}));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: h.error }),
}));

const { PodBannersPanel } = await import('../src/banner-kit/PodBannersPanel');
const q = await import('../src/banner-kit/queries');

const POD = { id: 'p1', pod_title: 'Quiz Night', pod_date_time: '2026-11-20T13:30:00.000Z' };
const SLIDES = [
  { url: 'https://ik.imagekit.io/duncit/p1-cover.png', kind: 'COVER' },
  { url: 'https://ik.imagekit.io/duncit/p1-venue.png', kind: 'VENUE' },
];

const pods = (rows: unknown[] | undefined, over: Record<string, unknown> = {}) =>
  h.useQuery.mockReturnValue({ data: rows ? { podsTable: { rows } } : undefined, loading: false, error: undefined, ...over });
const mutation = (state: Record<string, unknown>) => h.useMutation.mockReturnValue([h.generate, { loading: false, ...state }]);

beforeEach(() => {
  h.useQuery.mockReset();
  h.useMutation.mockReset();
  h.generate.mockReset().mockResolvedValue({});
  h.notifySuccess.mockReset();
  h.error.mockReset();
  mutation({});
});

describe('PodBannersPanel', () => {
  it("asks for the venue's upcoming pods, soonest first", () => {
    pods([POD]);
    render(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);
    expect(h.useQuery).toHaveBeenCalledWith(q.BANNER_PODS, {
      variables: {
        query: {
          page: 1,
          page_size: 25,
          sort_by: 'pod_date_time',
          sort_dir: 'asc',
          filters: [{ field: 'venue_id', op: 'eq', value: 'v1' }],
        },
      },
      fetchPolicy: 'cache-and-network',
      skip: false,
    });
    const row = screen.getByTestId('pod-banners-p1');
    expect(within(row).getByText('Quiz Night')).toBeInTheDocument();
    expect(within(row).getByText('on 2026-11-20T13:30:00.000Z')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Make banners' })).toBeInTheDocument();
  });

  it('waits for the host before asking, and says when there is nothing coming up', () => {
    pods(undefined);
    const { rerender } = render(<PodBannersPanel filter={{ field: 'host_user_id', value: '' }} />);
    expect(h.useQuery).toHaveBeenLastCalledWith(q.BANNER_PODS, expect.objectContaining({ skip: true }));

    pods([]);
    rerender(<PodBannersPanel filter={{ field: 'host_user_id', value: 'u1' }} />);
    expect(screen.getByTestId('pod-banners-empty')).toHaveTextContent('No upcoming pods yet.');
  });

  it('shows a spinner on the first read and the reason a read failed', () => {
    pods(undefined, { loading: true });
    const { rerender } = render(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    pods(undefined, { error: new Error('Network down') });
    rerender(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });

  it('makes the banners for the pod and says they are ready', async () => {
    pods([POD]);
    render(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);
    expect(h.useMutation).toHaveBeenCalledWith(q.GENERATE_POD_BANNERS);
    fireEvent.click(screen.getByTestId('pod-banners-make-p1'));
    await waitFor(() => expect(h.notifySuccess).toHaveBeenCalledWith('Banners ready'));
    expect(h.generate).toHaveBeenCalledWith({ variables: { pod_id: 'p1' } });
  });

  it('shows each slide with its download link once made, and offers to make them again', () => {
    pods([POD]);
    mutation({ data: { generatePodBanners: { run_id: 'r1', style: 'PORTRAIT', slides: SLIDES } } });
    render(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);

    expect(screen.getByText('2 slides')).toBeInTheDocument();
    expect(screen.getByAltText('Slide 2 of Quiz Night')).toHaveAttribute('src', SLIDES[1].url);
    const link = screen.getByRole('link', { name: 'Download slide 1' });
    expect(link).toHaveAttribute('href', SLIDES[0].url);
    expect(link).toHaveAttribute('download');
    expect(screen.getByTestId('pod-banners-make-p1')).toHaveTextContent('Make again');
  });

  it('shows why the banners could not be made, and logs the failure', async () => {
    pods([POD]);
    const refusal = new Error('This pod has no venue kit yet');
    h.generate.mockRejectedValue(refusal);
    mutation({ error: refusal });
    render(<PodBannersPanel filter={{ field: 'venue_id', value: 'v1' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('This pod has no venue kit yet');
    fireEvent.click(screen.getByTestId('pod-banners-make-p1'));
    await waitFor(() =>
      expect(h.error).toHaveBeenCalledWith('PodBannersPanel', 'generatePodBanners', { error: refusal }),
    );
    expect(h.notifySuccess).not.toHaveBeenCalled();
  });
});
