import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import type { PodAuditLog } from '@duncit/utils';

import { renderWithProviders } from '@/utils/test-utils';
import { AuditLogChanges } from '../AuditLogChanges';
import { AuditLogRow } from '../AuditLogRow';
import { AuditLogSheet } from '../AuditLogSheet';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const logOf = (patch: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'a1',
  pod_id: 'p1',
  pod_title: 'Sunday Smash',
  club_id: 'c1',
  actor_user_id: 'u1',
  actor_name: 'Asha',
  source: 'CLUB_ADMIN',
  action: 'UPDATE',
  changes: [
    { field: 'title', from: 'Old', to: 'New' },
    { field: 'price', from: '', to: '200' },
    { field: 'notes', from: 'x', to: '' },
  ],
  note: '',
  ai_risk: 'LOW',
  ai_summary: '',
  ai_reviewed_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...patch,
});

describe('AuditLogChanges', () => {
  it('counts the changes and shows each field before and after, blanks as the empty word', () => {
    renderWithProviders(<AuditLogChanges log={logOf()} testID="chg" />);
    expect(screen.getByText('clubAdmin.monitoring.changesCount|3')).toBeOnTheScreen();
    expect(screen.getByText('Old → New')).toBeOnTheScreen();
    expect(screen.getByText('clubAdmin.monitoring.emptyValue → 200')).toBeOnTheScreen();
    expect(screen.getByText('x → clubAdmin.monitoring.emptyValue')).toBeOnTheScreen();
    expect(screen.queryByTestId('chg-none')).toBeNull();
  });

  it('says nothing was tracked when there are no changes', () => {
    renderWithProviders(<AuditLogChanges log={logOf({ changes: [] })} testID="chg" />);
    expect(screen.getByText('clubAdmin.monitoring.changesCount|0')).toBeOnTheScreen();
    expect(screen.getByTestId('chg-none')).toHaveTextContent('clubAdmin.monitoring.noChanges');
  });

  it('shows the note behind the action when there is one', () => {
    renderWithProviders(<AuditLogChanges log={logOf({ note: 'Venue closed' })} testID="chg" />);
    expect(screen.getByTestId('chg-note')).toHaveTextContent(
      'clubAdmin.monitoring.note Venue closed',
    );
  });

  it('shows no note line without a note', () => {
    renderWithProviders(<AuditLogChanges log={logOf()} testID="chg" />);
    expect(screen.queryByTestId('chg-note')).toBeNull();
  });
});

describe('AuditLogRow', () => {
  const mount = (log: PodAuditLog, onPress?: () => void) =>
    renderWithProviders(
      <AuditLogRow log={log} when="1 Oct, 10:00" testID="row" onPress={onPress} />,
    );

  it('shows the pod, what happened, the AI risk, the time and who did it', () => {
    mount(logOf());
    expect(screen.getByText('Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByTestId('row-action')).toHaveTextContent('clubAdmin.audit.action.update');
    expect(screen.getByTestId('row-risk')).toHaveTextContent(
      'clubAdmin.monitoring.aiRiskChip|clubAdmin.audit.risk.low',
    );
    expect(screen.getByText('1 Oct, 10:00')).toBeOnTheScreen();
    expect(screen.getByText('Asha · clubAdmin.audit.source.clubAdmin')).toBeOnTheScreen();
  });

  it('names an unknown actor', () => {
    mount(logOf({ actor_name: '', source: 'SYSTEM' }));
    expect(
      screen.getByText('clubAdmin.monitoring.unknownActor · clubAdmin.audit.source.system'),
    ).toBeOnTheScreen();
  });

  it('shows the AI summary when there is one', () => {
    mount(logOf({ ai_summary: 'Deleted close to start' }));
    expect(screen.getByText('Deleted close to start')).toBeOnTheScreen();
  });

  it('shows no summary line without one', () => {
    mount(logOf());
    expect(screen.queryByText('Deleted close to start')).toBeNull();
  });

  it('is a button named by the pod when it can be opened', async () => {
    const onPress = jest.fn();
    mount(logOf(), onPress);
    const row = screen.getByTestId('row');
    expect(row.props.role).toBe('button');
    expect(row.props['aria-label']).toBe('Sunday Smash');
    await userEvent.setup().press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is plain content when there is nothing to open', () => {
    mount(logOf());
    const row = screen.getByTestId('row');
    expect(row.props.role).toBeUndefined();
    expect(row.props['aria-label']).toBeUndefined();
  });
});

describe('AuditLogSheet', () => {
  const mount = (log: PodAuditLog | null) => {
    const onClose = jest.fn();
    renderWithProviders(<AuditLogSheet log={log} when="1 Oct, 10:00" onClose={onClose} />);
    return onClose;
  };

  it('shows nothing without an entry', () => {
    mount(null);
    expect(screen.queryByText('clubAdmin.monitoring.when')).toBeNull();
  });

  it('shows the entry in full', () => {
    mount(logOf({ ai_summary: 'Looks routine', note: 'Venue closed' }));
    expect(screen.getByText('Sunday Smash')).toBeOnTheScreen();
    expect(screen.getByText('clubAdmin.audit.action.update')).toBeOnTheScreen();
    expect(screen.getByText('1 Oct, 10:00')).toBeOnTheScreen();
    expect(screen.getByText('Asha · clubAdmin.audit.source.clubAdmin')).toBeOnTheScreen();
    expect(screen.getByTestId('club-monitoring-detail-risk')).toHaveTextContent(
      'clubAdmin.audit.risk.low',
    );
    expect(screen.getByTestId('club-monitoring-detail-summary')).toHaveTextContent('Looks routine');
    expect(screen.getByTestId('club-monitoring-detail-changes-note')).toBeOnTheScreen();
  });

  it('names an unknown actor and omits an empty AI summary', () => {
    mount(logOf({ actor_name: '' }));
    expect(
      screen.getByText('clubAdmin.monitoring.unknownActor · clubAdmin.audit.source.clubAdmin'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('club-monitoring-detail-summary')).toBeNull();
  });

  it('closes from its footer button', async () => {
    const onClose = mount(logOf());
    await act(async () => {
      fireEvent.press(screen.getAllByTestId('club-monitoring-detail-close').at(-1) as never);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
