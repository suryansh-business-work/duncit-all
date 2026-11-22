import { describe, expect, it } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import MyTargetsPage from '../../src/pages/targets/MyTargetsPage';
import { renderWithProviders } from '../testkit';
import { makeSubmission, makeTarget, myDueTargetsMock, myTargetsTableMock } from '../mocks';

/**
 * Employee > My Targets: the months the Targets team set goals for, where each
 * report stands, and the month-end banner while one still needs a report.
 */
const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/targets'],
    routes: (
      <>
        <Route path="/targets" element={<MyTargetsPage />} />
        <Route path="/targets/:targetId" element={<div>TARGET DETAIL</div>} />
      </>
    ),
  });

describe('MyTargetsPage', () => {
  it('says so when no target has been set yet, with no banner', async () => {
    renderPage([myTargetsTableMock([]), myDueTargetsMock([])]);
    expect(await screen.findByText('My Targets')).toBeInTheDocument();
    expect(await screen.findByText('No monthly targets have been set for you yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('target-reminder-banner')).not.toBeInTheDocument();
  });

  it('lists each month with its goals, status and completion', async () => {
    const reported = makeTarget({
      id: 'tgt-2',
      month: '2026-10',
      status: 'REVIEWED',
      submission: makeSubmission({ completion_percent: 90 }),
    });
    renderPage([myTargetsTableMock([makeTarget(), reported]), myDueTargetsMock([])]);

    expect(await screen.findByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('Assigned', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Reviewed', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('shows the month-end banner from the server’s due list and opens that month', async () => {
    renderPage([myTargetsTableMock([makeTarget()]), myDueTargetsMock([{ id: 'tgt-1', month: '2026-11' }])]);

    const banner = await screen.findByTestId('target-reminder-banner');
    expect(banner).toHaveTextContent('Your monthly target needs a progress report');
    expect(banner).toHaveTextContent('Share your completion and achievements for November 2026.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit progress' }));
    expect(await screen.findByText('TARGET DETAIL')).toBeInTheDocument();
  });

  it('opens a month when its row is clicked', async () => {
    renderPage([myTargetsTableMock([makeTarget()]), myDueTargetsMock([])]);
    fireEvent.click(await screen.findByText('November 2026'));
    expect(await screen.findByText('TARGET DETAIL')).toBeInTheDocument();
  });
});
