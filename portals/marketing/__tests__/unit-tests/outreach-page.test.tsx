import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { makeOutreachSequence, makeOutreachTask, outreachSequencesMock, outreachTasksMock } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));
const userCtx = vi.hoisted(() => ({ roles: ['MARKETING_MANAGER'] as string[] }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: userCtx.roles } }),
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import OutreachPage from '../../src/pages/outreach-page';
import {
  ENROLLMENT_STATUSES,
  OUTREACH_LIMITS,
  STEP_KINDS,
  canPauseStatus,
  canResumeStatus,
  isEnrollmentStatus,
} from '../../src/pages/outreach-page/copy';
import { canManageOutreach } from '../../src/pages/outreach-page/roles';

/** What the guide kit remembers for u1 once the Outreach tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.outreach"]'] as const;

beforeEach(() => {
  userCtx.roles = ['MARKETING_MANAGER'];
});

afterEach(() => {
  __setTableRows([]);
  vi.clearAllMocks();
});

const renderPage = (path = '/outreach/sequences', mocks = [outreachSequencesMock([makeOutreachSequence()])]) =>
  renderWithProviders(<OutreachPage />, { initialEntries: [path], mocks });

describe('OutreachPage', () => {
  it('opens on Sequences with its heading, intro and the three tabs', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Sequences' })).toBeInTheDocument();
    expect(screen.getByText('Step-by-step outreach to your leads, stopped by a reply or an opt-out.')).toBeInTheDocument();
    const intro = screen.getByTestId('page-intro');
    expect(within(intro).getByText(/A sequence walks each enrolled lead/)).toBeInTheDocument();
    expect(within(intro).getByText(/Only managers switch sequences on/)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Sequences', 'Enrollments', 'DM tasks']);
    expect(screen.getByRole('tab', { name: 'Sequences' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('sequence-card-seq1')).toBeInTheDocument();
    // A manager gets the switch, not the read-only chip.
    expect(screen.getByTestId('sequence-switch-seq1')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('hands an editor the read-only card', async () => {
    localStorage.setItem(...TOUR_SEEN);
    userCtx.roles = ['MARKETING_EDITOR'];
    renderPage();
    expect(await screen.findByTestId('sequence-state-seq1')).toHaveTextContent('Off');
    expect(screen.queryByTestId('sequence-switch-seq1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sequence-enroll-seq1')).not.toBeInTheDocument();
  });

  it('opens the Enrollments tab the URL names', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage('/outreach/sequences?selectedtab=enrollments', []);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No leads are enrolled yet.');
    expect(screen.getByRole('tab', { name: 'Enrollments' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens DM tasks from the URL, and moves back to Sequences from the tab bar', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage('/outreach/sequences?selectedtab=tasks', [outreachTasksMock([makeOutreachTask()]), outreachSequencesMock([makeOutreachSequence()])]);
    expect(await screen.findByTestId('task-t1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Sequences' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Sequences' })).toHaveAttribute('aria-selected', 'true'));
    expect(await screen.findByTestId('sequence-card-seq1')).toBeInTheDocument();
    expect(screen.queryByTestId('tasks-tab')).not.toBeInTheDocument();
  });

  it('walks a first-time visitor through the tabs and New sequence, then remembers', () => {
    renderPage();
    expect(screen.getByRole('dialog', { name: 'Sequences, enrollments and DM tasks' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Start a sequence' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN[0])).toBe(TOUR_SEEN[1]);
  });
});

describe('the outreach vocabulary', () => {
  it('names the four step kinds and six statuses, and reads a status off the URL only when it is one', () => {
    expect(STEP_KINDS).toEqual(['EMAIL', 'WHATSAPP', 'DM_TASK', 'WAIT']);
    expect(ENROLLMENT_STATUSES.every(isEnrollmentStatus)).toBe(true);
    expect(isEnrollmentStatus('WON')).toBe(false);
    expect(isEnrollmentStatus(null)).toBe(false);
  });

  it('lets an active enrollment pause, and a paused or failed one carry on', () => {
    expect(ENROLLMENT_STATUSES.filter(canPauseStatus)).toEqual(['ACTIVE']);
    expect(ENROLLMENT_STATUSES.filter(canResumeStatus)).toEqual(['PAUSED', 'FAILED']);
  });

  it('mirrors the server’s bounds', () => {
    expect(OUTREACH_LIMITS.daily_limit).toEqual({ min: 1, max: 500 });
    expect(OUTREACH_LIMITS.steps.max).toBe(20);
    expect(OUTREACH_LIMITS.wait_days).toEqual({ min: 1, max: 60 });
  });

  it('gives managing to a manager or super admin only', () => {
    expect(canManageOutreach(['MARKETING_MANAGER'])).toBe(true);
    expect(canManageOutreach(['USER', 'SUPER_ADMIN'])).toBe(true);
    expect(canManageOutreach(['MARKETING_EDITOR', 'CITY_ADMIN'])).toBe(false);
    expect(canManageOutreach(null)).toBe(false);
    expect(canManageOutreach(undefined)).toBe(false);
  });
});
