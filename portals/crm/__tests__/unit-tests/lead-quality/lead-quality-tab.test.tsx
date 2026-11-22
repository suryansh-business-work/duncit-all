import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import LeadQualityTab from '@/components/lead-quality-tab/LeadQualityTab';
import { LEAD_QUALITY, RECALCULATE_LEAD_QUALITY } from '@/api/leadQuality.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { DECIDED_AT, LEAD_ID, SCORED_AT, details, historyEvent, historyMock, qualityMock, qualityVars, rescored } from './fixtures';

const renderTab = (mocks: MockedResponse[]) => renderWithApollo(<LeadQualityTab entity="VENUE_LEAD" leadId={LEAD_ID} />, mocks);

/** The cells of a breakdown row after its row header (Maximum, Earned, Status). */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell').map((cell) => cell.textContent);

const recalcMock = (external: boolean, answer: () => { data: Record<string, unknown> }): MockedResponse => ({
  request: { query: RECALCULATE_LEAD_QUALITY, variables: { ...qualityVars, external } },
  result: answer,
});

describe('LeadQualityTab', () => {
  it('shows a loading state, then the summary, every criterion and the total from one result', async () => {
    renderTab([qualityMock(details()), historyMock([])]);

    expect(screen.getByRole('status', { name: 'Loading the quality score' })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Quality score breakdown by criterion' });

    // Summary: the ring, the classification and the qualification read the same result as the table.
    expect(screen.getByRole('img', { name: 'Quality score 70 out of 100, Good' })).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-classification')).toHaveTextContent('Good');
    expect(screen.getByTestId('lead-quality-qualification')).toHaveTextContent('Pending verification');
    expect(screen.getByTestId('lead-quality-verification')).toHaveTextContent('Verification in progress');
    expect(screen.getByText('3 verified · 1 pending · 1 not met')).toBeInTheDocument();
    expect(screen.getByText('Up to 80 if every pending item is verified')).toBeInTheDocument();
    expect(screen.getByText('Qualifies at 60 or more once every gate has passed')).toBeInTheDocument();
    expect(screen.getByText(`Scored ${formatDateTime(SCORED_AT)} with criteria version 3`)).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-gate-instagram')).toHaveTextContent('Instagram presence: Passed');

    const header = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(header).toEqual(['Quality criteria', 'Maximum', 'Earned', 'Status']);

    const instagram = screen.getByTestId('lead-quality-criterion-instagram');
    expect(within(instagram).getByRole('rowheader')).toHaveTextContent('Instagram presenceGate');
    expect(cellsOf(instagram)).toEqual(['30', '20', 'Partial']);
    expect(cellsOf(screen.getByTestId('lead-quality-criterion-maps'))).toEqual(['40', '40', 'Verified']);
    expect(cellsOf(screen.getByTestId('lead-quality-criterion-website'))).toEqual(['30', '10', 'Partial']);

    const total = screen.getByTestId('lead-quality-total');
    expect(within(total).getByRole('rowheader')).toHaveTextContent('Total');
    expect(cellsOf(total)).toEqual(['100', '70', 'Good']);
  });

  it('expands a criterion to its items: points, status, how it is checked, the evidence and who decided it', async () => {
    renderTab([qualityMock(details()), historyMock([])]);

    const toggle = await screen.findByRole('button', { name: 'Show the items of Instagram presence' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('lead-quality-item-instagram.profile')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide the items of Instagram presence' })).toHaveAttribute('aria-expanded', 'true');

    const profile = screen.getByTestId('lead-quality-item-instagram.profile');
    expect(profile).toHaveTextContent('Business profile');
    expect(profile).toHaveTextContent('20 of 20 points');
    expect(profile).toHaveTextContent('Instagram business profile');
    expect(within(profile).getByText('Business account @grandhall')).toBeInTheDocument();
    expect(within(profile).getByRole('link', { name: /instagram\.com\/grandhall/ })).toHaveAttribute('href', 'https://instagram.com/grandhall');
    expect(within(profile).getByText(`Automatic check · System · ${formatDateTime(DECIDED_AT)}`)).toBeInTheDocument();

    const followers = screen.getByTestId('lead-quality-item-instagram.followers');
    expect(followers).toHaveTextContent('0 of 10 points');
    expect(within(followers).getByText('Instagram followers · Threshold: 1000')).toBeInTheDocument();
    expect(within(followers).getByText('How to verify: Open the profile and read the follower count')).toBeInTheDocument();
    expect(within(followers).getByText('No evidence recorded yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide the items of Instagram presence' }));
    await waitFor(() => expect(screen.queryByTestId('lead-quality-item-instagram.profile')).not.toBeInTheDocument());
  });

  it('says when the score could not be loaded and loads it again on Try again', async () => {
    renderTab([
      { request: { query: LEAD_QUALITY, variables: qualityVars }, error: new Error('Quality service is down') },
      qualityMock(details()),
      historyMock([]),
    ]);

    const alert = await screen.findByTestId('lead-quality-error');
    expect(alert).toHaveTextContent('The quality score could not be loaded. Quality service is down');

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Quality score breakdown by criterion' })).toBeInTheDocument();
  });

  it('recalculates on demand, and the ring, the total and the qualification all move to the new result', async () => {
    const answer = vi.fn(() => ({
      data: { recalculateCrmLeadQuality: { skipped_checks: ['Instagram: no connected business account'], details: rescored() } },
    }));
    renderTab([qualityMock(details()), historyMock([]), recalcMock(false, answer)]);

    fireEvent.click(await screen.findByRole('button', { name: 'Recalculate' }));

    expect(await screen.findByRole('img', { name: 'Quality score 80 out of 100, Excellent' })).toBeInTheDocument();
    expect(answer).toHaveBeenCalledTimes(1);
    expect(cellsOf(screen.getByTestId('lead-quality-total'))).toEqual(['100', '80', 'Excellent']);
    expect(screen.getByTestId('lead-quality-qualification')).toHaveTextContent('Qualified');
    const skipped = screen.getByTestId('lead-quality-skipped');
    expect(skipped).toHaveTextContent('Some automatic checks could not run');
    expect(skipped).toHaveTextContent('Instagram: no connected business account');
  });

  it('reverify asks the server to rerun the Instagram, Maps and website checks too', async () => {
    const answer = vi.fn(() => ({ data: { recalculateCrmLeadQuality: { skipped_checks: [], details: rescored() } } }));
    renderTab([qualityMock(details()), historyMock([]), recalcMock(true, answer)]);

    const reverify = await screen.findByRole('button', { name: 'Reverify' });
    expect(reverify).toHaveAccessibleDescription('Recalculates and also reruns the Instagram, Google Maps and website checks.');
    fireEvent.click(reverify);

    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('img', { name: 'Quality score 80 out of 100, Excellent' })).toBeInTheDocument();
  });

  it('shows why a recalculation failed and keeps the score it had', async () => {
    renderTab([
      qualityMock(details()),
      historyMock([]),
      { request: { query: RECALCULATE_LEAD_QUALITY, variables: { ...qualityVars, external: false } }, error: new Error('Lead not found') },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Recalculate' }));

    expect(await screen.findByText('The score could not be recalculated: Lead not found')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Quality score 70 out of 100, Good' })).toBeInTheDocument();
  });

  it('explains a lead that was never scored and shows no breakdown', async () => {
    renderTab([qualityMock(details({ result: null, scored_version: null, scored_at: null, stale: true })), historyMock([])]);

    expect(await screen.findByTestId('lead-quality-not-scored')).toHaveTextContent(
      'This lead has not been scored yet. Recalculate to score it with the published criteria.',
    );
    expect(screen.getByRole('img', { name: 'Not scored yet' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lead-quality-stale')).not.toBeInTheDocument();
  });

  it('warns when the score was worked out with an older version of the criteria', async () => {
    renderTab([qualityMock(details({ stale: true, scored_version: 2 })), historyMock([])]);

    expect(await screen.findByTestId('lead-quality-stale')).toHaveTextContent(
      'Scored with version 2 of the criteria, but version 3 is published now. Recalculate to update the score.',
    );
  });

  it('lists the score and evidence history, newest first, naming items and who changed them', async () => {
    renderTab([
      qualityMock(details()),
      historyMock([
        historyEvent({ id: 'ev-2', kind: 'EVIDENCE', trigger: null, item_key: 'website.booking', status_before: 'PENDING', status_after: 'FAILED', evidence: 'No booking page on the site', via: 'MANUAL', score_before: null, score_after: null, classification: '' }),
        historyEvent({ id: 'ev-1' }),
      ]),
    ]);

    const evidence = await screen.findByTestId('lead-quality-event-ev-2');
    const score = screen.getByTestId('lead-quality-event-ev-1');
    expect(evidence).toHaveTextContent('Online booking: Pending → Not met');
    expect(evidence).toHaveTextContent('No booking page on the site');
    expect(evidence).toHaveTextContent(`CRM team · Priya Sharma · ${formatDateTime(SCORED_AT)}`);
    expect(score).toHaveTextContent('Score 50 → 70');
    expect(score).toHaveTextContent('Good');
    expect(score).toHaveTextContent(`Recalculated · Priya Sharma · ${formatDateTime(SCORED_AT)}`);
    expect(evidence.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says when there is no history yet', async () => {
    renderTab([qualityMock(details()), historyMock([])]);
    expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument();
  });
});
