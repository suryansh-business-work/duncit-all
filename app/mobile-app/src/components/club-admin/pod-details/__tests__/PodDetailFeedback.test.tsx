import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubAdminPodFeedbackDocument } from '@/graphql/club-pod-details';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailFeedback } from '../PodDetailFeedback';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const summary = (patch: Record<string, unknown> = {}) => ({
  total: 2,
  overall_average: 4.25,
  aspects: [
    { aspect: 'VENUE', average: 4.5, count: 2 },
    { aspect: 'SOMETHING_NEW', average: 3, count: 1 },
  ],
  recent: [
    {
      id: 'r1',
      user: { name: 'Asha' },
      rating: 5,
      message: 'Loved it',
      created_at: '2026-10-01T10:00:00Z',
    },
    { id: 'r2', user: { name: 'Bo' }, rating: 3, message: '', created_at: '2026-10-02T10:00:00Z' },
  ],
  ...patch,
});

const answer = (value: unknown) => request.mockResolvedValue({ clubAdminPodFeedback: value });

beforeEach(() => jest.clearAllMocks());

describe('PodDetailFeedback', () => {
  it('reads the ratings of this pod, with a spinner meanwhile', async () => {
    answer(summary());
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(screen.getByTestId('club-pod-detail-ratings-loading')).toBeOnTheScreen();
    await screen.findByTestId('club-pod-detail-rating-average');
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodFeedbackDocument,
      { pod_doc_id: 'p1' },
      { auth: true },
    );
    expect(screen.queryByTestId('club-pod-detail-ratings-loading')).toBeNull();
  });

  it('shows the overall average, the count and the number of ratings as a badge', async () => {
    answer(summary());
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-rating-average')).toHaveTextContent('4.3');
    expect(screen.getByText('podDetailsPanel.podFeedbackSection.ratingsCount|2')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-ratings-badge')).toHaveTextContent('2');
  });

  it('shows each rated part with its average and how many people said so', async () => {
    answer(summary());
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(await screen.findByText('4.5 · 2')).toBeOnTheScreen();
    expect(screen.getByText('3.0 · 1')).toBeOnTheScreen();
    // A part this build has no label for is shown as the server named it.
    expect(screen.getByText('SOMETHING_NEW')).toBeOnTheScreen();
  });

  it('shows each guest rating with the time and their message when they wrote one', async () => {
    answer(summary());
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-rating-r1')).toBeOnTheScreen();
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('at 2026-10-01T10:00:00Z')).toBeOnTheScreen();
    expect(screen.getByText('Loved it')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-rating-r2')).toBeOnTheScreen();
    expect(screen.getByText('at 2026-10-02T10:00:00Z')).toBeOnTheScreen();
  });

  it('says nobody has rated when the pod has no ratings', async () => {
    answer(summary({ total: 0, aspects: [], recent: [] }));
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-ratings-empty')).toHaveTextContent(
      'podDetailsPanel.podFeedbackSection.noRatings',
    );
    expect(screen.queryByTestId('club-pod-detail-rating-average')).toBeNull();
    expect(screen.queryByTestId('club-pod-detail-ratings-badge')).toBeNull();
  });

  it('asks for nothing without a pod id', () => {
    renderWithProviders(<PodDetailFeedback podId="" />);
    expect(request).not.toHaveBeenCalled();
  });

  it('says the load failed, not that nobody rated, and offers a retry that recovers', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PodDetailFeedback podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-ratings-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-detail-ratings-empty')).toBeNull();
    answer(summary());
    await act(async () => {
      fireEvent.press(screen.getByTestId('club-pod-detail-ratings-error-retry'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('club-pod-detail-rating-average')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('club-pod-detail-ratings-error')).toBeNull();
  });
});
