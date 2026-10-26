import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubAdminPodAuditLogsDocument } from '@/graphql/club-admin';
import type { ClubAdminPodRow } from '@/hooks/useClubAdminPods';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { ClubPodActivitySheet } from '../ClubPodActivitySheet';

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

const podOf = (id: string, title = 'Sunday Smash') =>
  ({ id, pod_title: title }) as unknown as ClubAdminPodRow;

const log = (id: string) => ({
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
});

const mount = (pod: ClubAdminPodRow | null) => {
  const onClose = jest.fn();
  const view = renderWithProviders(<ClubPodActivitySheet pod={pod} onClose={onClose} />);
  return { onClose, view };
};

beforeEach(() => jest.clearAllMocks());

describe('ClubPodActivitySheet', () => {
  it('stays closed and reads nothing without a pod', () => {
    mount(null);
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByTestId('club-pod-activity-empty')).toBeNull();
  });

  it('reads the trail of the pod, titled with its name, with a spinner meanwhile', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1')] });
    mount(podOf('p1'));
    expect(screen.getByText('clubAdmin.pods.activity|Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-activity-loading')).toBeOnTheScreen();
    await screen.findByTestId('club-pod-activity-a1');
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodAuditLogsDocument,
      { pod_doc_id: 'p1' },
      { auth: true },
    );
    expect(screen.queryByTestId('club-pod-activity-loading')).toBeNull();
  });

  it('shows each entry with its time and changes inline, with a divider between entries only', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1'), log('a2')] });
    mount(podOf('p1'));
    expect(await screen.findByTestId('club-pod-activity-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-activity-a2')).toBeOnTheScreen();
    expect(screen.getByText('at 2026-10-01T10:00:00Z')).toBeOnTheScreen();
    expect(screen.getAllByText('Old → New')).toHaveLength(2);
    expect(screen.getByTestId('club-pod-activity-a1-changes')).toBeOnTheScreen();
  });

  it('says there is no activity once loaded empty', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [] });
    mount(podOf('p1'));
    expect(await screen.findByTestId('club-pod-activity-empty')).toHaveTextContent(
      'clubAdmin.pods.noActivity',
    );
  });

  it('says the load failed, not that there is no activity, and retries', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    mount(podOf('p1'));
    expect(await screen.findByTestId('club-pod-activity-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-activity-empty')).toBeNull();
    request.mockResolvedValueOnce({ clubAdminPodAuditLogs: [log('a1')] });
    await act(async () => {
      fireEvent.press(screen.getByTestId('club-pod-activity-error-retry'));
    });
    await waitFor(() => expect(screen.getByTestId('club-pod-activity-a1')).toBeOnTheScreen());
    expect(screen.queryByTestId('club-pod-activity-error')).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('reads the trail again for another pod', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1')] });
    const { view } = mount(podOf('p1'));
    await screen.findByTestId('club-pod-activity-a1');
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a2')] });
    view.rerender(<ClubPodActivitySheet pod={podOf('p2', 'Other pod')} onClose={jest.fn()} />);
    expect(await screen.findByTestId('club-pod-activity-a2')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-activity-a1')).toBeNull();
    expect(request).toHaveBeenLastCalledWith(
      ClubAdminPodAuditLogsDocument,
      { pod_doc_id: 'p2' },
      { auth: true },
    );
  });

  it('clears the trail when the sheet closes', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [log('a1')] });
    const { view } = mount(podOf('p1'));
    await screen.findByTestId('club-pod-activity-a1');
    view.rerender(<ClubPodActivitySheet pod={null} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('club-pod-activity-a1')).toBeNull());
  });

  it('ignores an answer that arrives after the sheet moved on', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { view } = mount(podOf('p1'));
    view.rerender(<ClubPodActivitySheet pod={null} onClose={jest.fn()} />);
    await act(async () => finish({ clubAdminPodAuditLogs: [log('a1')] }));
    expect(screen.queryByTestId('club-pod-activity-a1')).toBeNull();
  });

  it('ignores a failure that arrives after the sheet moved on', async () => {
    let fail: (reason: Error) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)));
    const { view } = mount(podOf('p1'));
    view.rerender(<ClubPodActivitySheet pod={null} onClose={jest.fn()} />);
    await act(async () => fail(new Error('late')));
    expect(screen.queryByTestId('club-pod-activity-error')).toBeNull();
  });

  it('closes from its footer button', async () => {
    request.mockResolvedValue({ clubAdminPodAuditLogs: [] });
    const { onClose } = mount(podOf('p1'));
    await screen.findByTestId('club-pod-activity-empty');
    fireEvent.press(screen.getAllByTestId('club-pod-activity-close').at(-1) as never);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
