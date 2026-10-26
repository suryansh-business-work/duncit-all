import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubAdminPodAuditLogsDocument } from '@/graphql/club-admin';
import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailTimeline } from '../PodDetailTimeline';

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

const pod = {
  id: 'p1',
  created_at: '2026-09-01T10:00:00.000Z',
  pod_date_time: '2999-01-01T10:00:00.000Z',
  is_deleted: false,
  completed_at: null,
  deleted_at: null,
} as unknown as ClubPodDetail;

const log = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  pod_id: 'p1',
  pod_title: 'Sunday Smash',
  club_id: 'c1',
  actor_user_id: 'u1',
  actor_name: 'Asha',
  source: 'HOST',
  action: 'UPDATE',
  changes: [{ field: 'title', from: 'Old', to: 'New' }],
  note: '',
  ai_risk: 'LOW',
  ai_summary: '',
  ai_reviewed_at: null,
  created_at: `2026-10-0${id.slice(-1)}T10:00:00Z`,
  ...patch,
});

beforeEach(() => jest.clearAllMocks());

describe('PodDetailTimeline', () => {
  it('shows the lifecycle strip and the activity heading', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1')] });
    renderWithProviders(<PodDetailTimeline pod={pod} />);
    expect(
      screen.getByRole('heading', { name: 'podDetailsPanel.podTimelineSection.timeline' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-step-created')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-activity-title')).toHaveTextContent(
      'podDetailsPanel.podTimelineSection.activity',
    );
    await screen.findByTestId('club-pod-detail-activity-a1');
  });

  it('reads the club-scoped trail of this pod, with a spinner meanwhile', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1')] });
    renderWithProviders(<PodDetailTimeline pod={pod} />);
    expect(screen.getByTestId('club-pod-detail-activity-loading')).toBeOnTheScreen();
    await screen.findByTestId('club-pod-detail-activity-a1');
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodAuditLogsDocument,
      { pod_doc_id: 'p1' },
      { auth: true },
    );
    expect(screen.queryByTestId('club-pod-detail-activity-loading')).toBeNull();
  });

  it('shows each entry with its time and changes folded underneath', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1'), log('a2', { changes: [] })] });
    renderWithProviders(<PodDetailTimeline pod={pod} />);
    expect(await screen.findByTestId('club-pod-detail-activity-a1')).toBeOnTheScreen();
    expect(screen.getByText('at 2026-10-01T10:00:00Z')).toBeOnTheScreen();
    expect(screen.getByText('Old → New')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-activity-a2-changes-none')).toBeOnTheScreen();
  });

  it('says there is no activity once loaded empty', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [] });
    renderWithProviders(<PodDetailTimeline pod={pod} />);
    expect(await screen.findByTestId('club-pod-detail-activity-empty')).toHaveTextContent(
      'clubAdmin.pods.noActivity',
    );
  });

  it('asks for nothing without a pod id', () => {
    renderWithProviders(<PodDetailTimeline pod={{ ...pod, id: '' } as ClubPodDetail} />);
    expect(request).not.toHaveBeenCalled();
  });

  it('says the load failed, not that there is no activity, and recovers on retry', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PodDetailTimeline pod={pod} />);
    expect(await screen.findByTestId('club-pod-detail-activity-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-detail-activity-empty')).toBeNull();
    request.mockResolvedValueOnce({ clubAdminPodAuditLogs: [log('a1')] });
    await act(async () => {
      fireEvent.press(screen.getByTestId('club-pod-detail-activity-error-retry'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('club-pod-detail-activity-a1')).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('club-pod-detail-activity-error')).toBeNull();
  });
});
