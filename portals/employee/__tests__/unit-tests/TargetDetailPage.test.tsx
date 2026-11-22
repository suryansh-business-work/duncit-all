import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import TargetDetailPage from '../../src/pages/targets/detail/TargetDetailPage';
import { renderWithProviders } from '../testkit';
import {
  makeReview,
  makeSubmission,
  makeTarget,
  myDueTargetsMock,
  myTargetErrorMock,
  myTargetMock,
  submitTargetMock,
} from '../mocks';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

/**
 * One month as the employee sees it: the goals, the report form until the
 * month is reviewed, the reviewer's comment, and what happens when a submit
 * loses a race or the month was reviewed meanwhile.
 */
const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks: [...mocks, myDueTargetsMock([])],
    initialEntries: ['/targets/tgt-1'],
    routes: (
      <>
        <Route path="/targets/:targetId" element={<TargetDetailPage />} />
        <Route path="/targets" element={<div>MY TARGETS</div>} />
      </>
    ),
  });

const fillAndSubmit = async () => {
  fireEvent.change(await screen.findByTestId('submit-target-percent'), { target: { value: '85' } });
  fireEvent.change(screen.getByTestId('submit-target-title-0'), { target: { value: 'Signed 30 venues' } });
  fireEvent.click(screen.getByTestId('submit-target-submit'));
};

afterEach(() => {
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('TargetDetailPage — reading a month', () => {
  it('shows the goals, their figures and the note, with the report form open', async () => {
    renderPage([myTargetMock(makeTarget({ reminder_active: true }))]);
    expect(await screen.findByText('Target for November 2026')).toBeInTheDocument();
    expect(screen.getByText('Set by Asha Planner')).toBeInTheDocument();
    expect(screen.getByText('1. Onboard venues')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru east')).toBeInTheDocument();
    expect(screen.getByText('Target: 40 venues')).toBeInTheDocument();
    expect(screen.getByText('2. Run pods')).toBeInTheDocument();
    expect(screen.getByText('Note: Focus on weekends')).toBeInTheDocument();
    expect(screen.getByText('The month is closing — please submit your progress.')).toBeInTheDocument();
    expect(screen.getByTestId('submit-target-form')).toBeInTheDocument();
    // The card is titled for a first report, and its button says the same.
    expect(screen.getAllByText('Submit progress').length).toBeGreaterThanOrEqual(2);
  });

  it('is read-only after review, with the reviewer’s comment and the report as it was', async () => {
    const reviewed = makeTarget({ status: 'REVIEWED', submission: makeSubmission({ updates: '' }), review: makeReview() });
    renderPage([myTargetMock(reviewed)]);
    expect(await screen.findByTestId('my-target-review')).toHaveTextContent('Comment from Asha Planner: Great month');
    expect(screen.getByText('This month has been reviewed and is now read-only.')).toBeInTheDocument();
    expect(screen.getByTestId('my-target-report')).toHaveTextContent('80%');
    expect(screen.getByText('Signed 32 venues')).toBeInTheDocument();
    expect(screen.getByText('No updates shared.')).toBeInTheDocument();
    expect(screen.queryByTestId('submit-target-form')).not.toBeInTheDocument();
  });

  it('says when a review has no comment', async () => {
    renderPage([myTargetMock(makeTarget({ status: 'REVIEWED', submission: makeSubmission(), review: makeReview('') }))]);
    expect(await screen.findByTestId('my-target-review')).toHaveTextContent('No comment.');
    expect(screen.getByText('Two more in legal review')).toBeInTheDocument();
  });

  it('says the month was not found, or could not be loaded, and goes back to the list', async () => {
    const { unmount } = renderPage([myTargetMock(null)]);
    expect(await screen.findByTestId('my-target-missing')).toHaveTextContent('This target was not found.');
    unmount();

    renderPage([myTargetErrorMock('boom')]);
    expect(await screen.findByTestId('my-target-missing')).toHaveTextContent('This target could not be loaded.');
    fireEvent.click(screen.getByTestId('my-target-back'));
    expect(await screen.findByText('MY TARGETS')).toBeInTheDocument();
  });
});

describe('TargetDetailPage — submitting', () => {
  it('sends the report against the loaded revision and confirms it', async () => {
    const success = vi.mocked(notifySuccess);
    const seen: Record<string, unknown>[] = [];
    renderPage([
      myTargetMock(makeTarget()),
      submitTargetMock((variables) => {
        seen.push(variables);
        return true;
      }),
    ]);
    await fillAndSubmit();
    await waitFor(() => expect(success).toHaveBeenCalledWith('Progress submitted'));
    expect(seen[0]).toEqual({
      id: 'tgt-1',
      input: {
        completion_percent: 85,
        achievements: [{ title: 'Signed 30 venues', details: '' }],
        updates: '',
        expected_revision: 0,
      },
    });
  });

  it('reloads the month and explains a submit that lost a race', async () => {
    const failure = vi.mocked(notifyError);
    renderPage([myTargetMock(makeTarget(), 'tgt-1', 2), submitTargetMock(() => true, { code: 'CONFLICT' })]);
    await fillAndSubmit();
    await waitFor(() =>
      expect(failure).toHaveBeenCalledWith('This month changed while you were editing. It has been reloaded — check it and submit again.')
    );
  });

  it('explains a month reviewed meanwhile, and any other failure', async () => {
    const failure = vi.mocked(notifyError);
    const { unmount } = renderPage([myTargetMock(makeTarget(), 'tgt-1', 2), submitTargetMock(() => true, { code: 'BAD_REQUEST' })]);
    await fillAndSubmit();
    await waitFor(() => expect(failure).toHaveBeenCalledWith('This month has just been reviewed and can no longer be changed.'));
    unmount();

    renderPage([myTargetMock(makeTarget()), submitTargetMock(() => true, { code: 'INTERNAL_SERVER_ERROR' })]);
    await fillAndSubmit();
    await waitFor(() => expect(failure).toHaveBeenCalledWith('Your progress could not be submitted. Please try again.'));
  });

  it('offers to update a report already sent', async () => {
    renderPage([myTargetMock(makeTarget({ status: 'SUBMITTED', submission: makeSubmission() }))]);
    expect(await screen.findByText('Update your report')).toBeInTheDocument();
  });
});
