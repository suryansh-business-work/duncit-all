import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import {
  makeOutreachEnrollment,
  makeOutreachHistory,
  pauseEnrollmentMock,
  removeEnrollmentMock,
  resumeEnrollmentErrorMock,
  resumeEnrollmentMock,
} from '../mocks';

type TableProps = ComponentProps<typeof import('./table-mock').DuncitTable> & { externalFilters?: ReadonlyArray<unknown> };
const tableSpy = vi.hoisted(() => ({ props: null as TableProps | null }));
vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  const DuncitTable = (props: TableProps) => {
    tableSpy.props = props;
    return <mock.DuncitTable {...props} />;
  };
  return { ...mock, DuncitTable };
});
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import { useTranslation } from '@duncit/app-settings';
import EnrollmentsTab, { pinnedEnrollmentFilters } from '../../src/pages/outreach-page/enrollments/EnrollmentsTab';
import { lastEvent } from '../../src/pages/outreach-page/enrollments/enrollmentColumns';

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

const renderTab = (path: string, mocks: MockedResponse[] = [], canManage = true) =>
  renderWithProviders(<EnrollmentsTab canManage={canManage} />, { initialEntries: [path], mocks });

describe('pinnedEnrollmentFilters', () => {
  it('pins the sequence and a status the URL names, and ignores a status that names nothing', () => {
    expect(pinnedEnrollmentFilters(new URLSearchParams('sequence=seq1&status=PAUSED'))).toEqual([
      { field: 'sequence_id', op: 'eq', value: 'seq1' },
      { field: 'status', op: 'eq', value: 'PAUSED' },
    ]);
    expect(pinnedEnrollmentFilters(new URLSearchParams('status=WON'))).toEqual([]);
  });
});

describe('lastEvent', () => {
  it('reads the newest entry with its text, its label alone, or a dash when nothing happened', () => {
    const { t } = renderHook(() => useTranslation()).result.current;
    expect(lastEvent(makeOutreachEnrollment(), t)).toBe('Sent: Email "Hello Blue Cafe" sent');
    expect(lastEvent(makeOutreachEnrollment({ history: [makeOutreachHistory({ kind: 'ENROLLED', text: '' })] }), t)).toBe('Enrolled');
    expect(lastEvent(makeOutreachEnrollment({ history: [] }), t)).toBe('—');
  });
});

describe('EnrollmentsTab', () => {
  it('lists each lead with its sequence, status, step, next step and last event, pinned off the URL', async () => {
    __setTableRows([
      makeOutreachEnrollment(),
      makeOutreachEnrollment({ id: 'en2', lead_company: '', status: 'FAILED', next_at: null, error: 'The template is not approved', step_index: 4 }),
    ]);
    renderTab('/outreach/sequences?selectedtab=enrollments&sequence=seq1');
    const rows = await screen.findAllByTestId('table-row');
    expect(tableSpy.props).toMatchObject({
      tableId: 'outreach-enrollments',
      externalFilters: [{ field: 'sequence_id', op: 'eq', value: 'seq1' }],
      searchPlaceholder: 'Search by lead name or company',
    });
    const [first, second] = rows;
    expect(within(first).getByTestId('cell-lead_name')).toHaveTextContent('Blue Cafe · Blue Cafe Pvt');
    expect(within(first).getByTestId('cell-sequence_name')).toHaveTextContent('Venue intro');
    expect(within(first).getByTestId('cell-status')).toHaveTextContent('Active');
    expect(within(first).getByTestId('cell-step_index')).toHaveTextContent('3 of 4');
    expect(within(first).getByTestId('cell-next_at')).toHaveTextContent('fmt:2026-11-03T09:00:00.000Z');
    expect(within(first).getByTestId('cell-history')).toHaveTextContent('Sent: Email "Hello Blue Cafe" sent');
    expect(within(second).getByTestId('cell-lead_name')).toHaveTextContent('Blue Cafe');
    expect(within(second).getByTestId('cell-step_index')).toHaveTextContent('4 of 4');
    expect(within(second).getByTestId('cell-next_at')).toHaveTextContent('—');
    expect(within(second).getByTestId('cell-history')).toHaveTextContent('The template is not approved');
    // An active one can pause; a failed one can be resumed; both can be removed.
    expect(within(first).getByRole('button', { name: 'Pause Blue Cafe' })).toBeInTheDocument();
    expect(within(first).queryByRole('button', { name: 'Resume Blue Cafe' })).not.toBeInTheDocument();
    expect(within(second).getByRole('button', { name: 'Resume Blue Cafe' })).toBeInTheDocument();
    expect(within(second).queryByRole('button', { name: 'Pause Blue Cafe' })).not.toBeInTheDocument();
    expect(within(second).getByRole('button', { name: 'Remove Blue Cafe from the sequence' })).toBeInTheDocument();
  });

  it('gives an editor no actions column', async () => {
    __setTableRows([makeOutreachEnrollment()]);
    renderTab('/outreach/sequences', [], false);
    await screen.findAllByTestId('table-row');
    expect(screen.queryByTestId('enrollment-actions-en1')).not.toBeInTheDocument();
    expect(tableSpy.props?.externalFilters).toEqual([]);
  });

  it('pauses and resumes, says so, and reloads the table', async () => {
    const active = makeOutreachEnrollment();
    const paused = makeOutreachEnrollment({ id: 'en2', status: 'PAUSED' });
    __setTableRows([active, paused]);
    renderTab('/outreach/sequences', [pauseEnrollmentMock(active), resumeEnrollmentMock(paused)]);
    fireEvent.click(within(await screen.findByTestId('enrollment-actions-en1')).getByRole('button', { name: 'Pause Blue Cafe' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Blue Cafe is paused.', 'success'));
    fireEvent.click(within(screen.getByTestId('enrollment-actions-en2')).getByRole('button', { name: 'Resume Blue Cafe' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Blue Cafe carries on.', 'success'));
  });

  it('reports a resume the server refused', async () => {
    __setTableRows([makeOutreachEnrollment({ status: 'FAILED' })]);
    renderTab('/outreach/sequences', [resumeEnrollmentErrorMock('en1', 'The sequence is off')]);
    fireEvent.click(within(await screen.findByTestId('enrollment-actions-en1')).getByRole('button', { name: 'Resume Blue Cafe' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The sequence is off', 'error'));
  });

  it('removes a lead only once the manager confirms', async () => {
    __setTableRows([makeOutreachEnrollment({ status: 'DONE' })]);
    dialogsMock.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderTab('/outreach/sequences', [removeEnrollmentMock('en1')]);
    const actions = await screen.findByTestId('enrollment-actions-en1');
    expect(within(actions).queryByRole('button', { name: 'Pause Blue Cafe' })).not.toBeInTheDocument();
    expect(within(actions).queryByRole('button', { name: 'Resume Blue Cafe' })).not.toBeInTheDocument();
    const remove = within(actions).getByRole('button', { name: 'Remove Blue Cafe from the sequence' });
    fireEvent.click(remove);
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Remove Blue Cafe from the sequence?',
        message: 'No more steps go out to this lead. What was already sent stays on record.',
        confirmLabel: 'Remove',
        destructive: true,
      }),
    );
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    fireEvent.click(remove);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Blue Cafe was removed.', 'success'));
  });
});
