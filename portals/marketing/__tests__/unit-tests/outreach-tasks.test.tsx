import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { completeTaskErrorMock, completeTaskMock, makeOutreachTask, outreachTasksErrorMock, outreachTasksMock } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import TasksTab from '../../src/pages/outreach-page/tasks/TasksTab';

afterEach(() => {
  vi.clearAllMocks();
});

const renderTab = (mocks: MockedResponse[]) => renderWithProviders(<TasksTab />, { mocks });
const TASK = makeOutreachTask();

describe('TasksTab', () => {
  it('says nothing is sent from here, and when there is nothing to send', async () => {
    renderTab([outreachTasksMock([])]);
    expect(screen.getByText('Send each DM from Instagram yourself, then mark it done. Nothing is sent from here.')).toBeInTheDocument();
    expect(await screen.findByTestId('tasks-empty')).toHaveTextContent('No DMs to send right now.');
  });

  it('says when the tasks could not be read', async () => {
    renderTab([outreachTasksErrorMock('Tasks unavailable')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tasks unavailable');
  });

  it('shows who to message, from which step, the words and a link to their profile', async () => {
    renderTab([outreachTasksMock([TASK, makeOutreachTask({ id: 't2', owner_name: null, created_at: null, lead_instagram_url: '', lead_instagram_handle: '' })])]);
    const card = await screen.findByTestId('task-t1');
    expect(within(card).getByRole('heading', { name: 'Blue Cafe · Venue intro, step 4' })).toBeInTheDocument();
    expect(within(card).getByText('Owner: Asha Rao · fmt:2026-10-31T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByTestId('task-text-t1')).toHaveTextContent('Hey Blue Cafe!');
    const link = within(card).getByRole('link', { name: 'Open @bluecafe on Instagram' });
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/bluecafe/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const other = screen.getByTestId('task-t2');
    expect(within(other).getByText(/^Owner: Unassigned ·/)).toBeInTheDocument();
    expect(screen.getByTestId('task-no-handle-t2')).toHaveTextContent('This lead has no Instagram handle.');
    expect(within(other).queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks a task done, says so, and reads the list again', async () => {
    renderTab([outreachTasksMock([TASK]), completeTaskMock(TASK), outreachTasksMock([])]);
    fireEvent.click(await screen.findByTestId('task-done-t1'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('DM to Blue Cafe marked done.', 'success'));
    expect(await screen.findByTestId('tasks-empty')).toBeInTheDocument();
  });

  it('reports a task the server would not close', async () => {
    renderTab([outreachTasksMock([TASK]), completeTaskErrorMock('t1', 'This task is already done')]);
    fireEvent.click(await screen.findByTestId('task-done-t1'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('This task is already done', 'error'));
    expect(screen.getByTestId('task-t1')).toBeInTheDocument();
  });
});
