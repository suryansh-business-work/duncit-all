import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { APPROVE_LEAD_CANDIDATES, REJECT_LEAD_CANDIDATES } from '@/api/leadResearch.gql';
import LeadResearchPage from '@/pages/lead-research';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { candidate, candidateMock, tableMock } from './fixtures';
import { approval, openCandidate } from './helpers';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

beforeEach(() => {
  window.localStorage.clear();
  notifySuccess.mockClear();
});

describe('Lead Research › review queue decisions', () => {
  it('adds a candidate even if unqualified when the box is ticked, then shows the outcome and the new lead', async () => {
    const added = candidate({ status: 'ADDED', crm_lead_id: 'v9', decided_at: '2026-11-21T08:00:00.000Z', decided_by: { __typename: 'CrmLeadQualityActor', id: 'u1', name: 'Asha' } });
    const server = { rows: [candidate()] };
    renderWithApollo(
      <LeadResearchPage />,
      [
        tableMock(() => server.rows),
        candidateMock(candidate()),
        {
          request: { query: APPROVE_LEAD_CANDIDATES, variables: { ids: ['c1'], allow_unqualified: true } },
          result: () => {
            server.rows = [added];
            return { data: { approveCrmLeadCandidates: [approval('ADDED', 'Added to the CRM.', 'v9')] } };
          },
        },
        candidateMock(added),
      ],
      { route: '/lead-research' }
    );

    const drawer = await openCandidate('The Barn Cafe');
    fireEvent.click(within(drawer).getByTestId('candidate-approve'));
    const dialog = await screen.findByRole('dialog', { name: 'Add 1 candidate to the CRM?' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Add even if not qualified' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to CRM' }));

    const outcomes = await screen.findByTestId('approval-outcomes');
    expect(outcomes).toHaveTextContent('1 of 1 added to the CRM');
    expect(outcomes).toHaveTextContent('Added to the CRM.');
    // The candidate is read again: it is ADDED now, so it can no longer be decided.
    await waitFor(() => expect(within(drawer).getByTestId('candidate-approve')).toBeDisabled());
    expect(within(drawer).getByTestId('candidate-reject')).toBeDisabled();
    expect(drawer).toHaveTextContent('Decided by Asha');
    // The drawer shows the outcome too, and both of its lead links open the new lead.
    for (const link of within(drawer).getAllByRole('link', { name: 'Open the CRM lead' })) {
      expect(link).toHaveAttribute('href', '/venue-leads/v9/view');
    }

    // Behind the open drawer the page is hidden from assistive tech; once closed, the outcome's link is reachable.
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('candidate-drawer')).toBeNull());
    await waitFor(() =>
      expect(within(screen.getByTestId('approval-outcomes')).getByRole('link', { name: 'Open the CRM lead' })).toHaveAttribute('href', '/venue-leads/v9/view')
    );
  });

  it('reports a candidate that was not added because it did not qualify', async () => {
    renderWithApollo(
      <LeadResearchPage />,
      [
        tableMock([candidate()]),
        candidateMock(candidate()),
        {
          request: { query: APPROVE_LEAD_CANDIDATES, variables: { ids: ['c1'], allow_unqualified: false } },
          result: { data: { approveCrmLeadCandidates: [approval('NOT_QUALIFIED', 'Score 35 is below the 60 needed.')] } },
        },
        candidateMock(candidate()),
      ],
      { route: '/lead-research' }
    );

    const drawer = await openCandidate('The Barn Cafe');
    fireEvent.click(within(drawer).getByTestId('candidate-approve'));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Add 1 candidate to the CRM?' })).getByRole('button', { name: 'Add to CRM' }));

    const outcomes = await screen.findByTestId('approval-outcomes');
    expect(outcomes).toHaveTextContent('0 of 1 added to the CRM');
    expect(within(outcomes).getByText('Not qualified')).toBeInTheDocument();
    expect(outcomes).toHaveTextContent('Score 35 is below the 60 needed.');
    expect(within(outcomes).queryByRole('link')).toBeNull();
  });

  it('keeps the dialog open with the reason when adding fails', async () => {
    renderWithApollo(
      <LeadResearchPage />,
      [
        tableMock([candidate()]),
        candidateMock(candidate()),
        { request: { query: APPROVE_LEAD_CANDIDATES, variables: { ids: ['c1'], allow_unqualified: false } }, error: new Error('Lead Research is unavailable') },
      ],
      { route: '/lead-research' }
    );

    const drawer = await openCandidate('The Barn Cafe');
    fireEvent.click(within(drawer).getByTestId('candidate-approve'));
    const dialog = await screen.findByRole('dialog', { name: 'Add 1 candidate to the CRM?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to CRM' }));

    expect(await within(dialog).findByText('Lead Research is unavailable')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add 1 candidate to the CRM?' })).toBeInTheDocument();
    expect(screen.queryByTestId('approval-outcomes')).toBeNull();
  });

  it('rejects a candidate with the note typed, and says how many were rejected', async () => {
    const rejected = candidate({ status: 'REJECTED', decision_note: 'Closed down', decided_at: '2026-11-21T08:00:00.000Z', decided_by: { __typename: 'CrmLeadQualityActor', id: 'u1', name: 'Asha' } });
    const server = { rows: [candidate()] };
    renderWithApollo(
      <LeadResearchPage />,
      [
        tableMock(() => server.rows),
        candidateMock(candidate()),
        {
          request: { query: REJECT_LEAD_CANDIDATES, variables: { ids: ['c1'], note: 'Closed down' } },
          result: () => {
            server.rows = [rejected];
            return { data: { rejectCrmLeadCandidates: 1 } };
          },
        },
        candidateMock(rejected),
      ],
      { route: '/lead-research' }
    );

    const drawer = await openCandidate('The Barn Cafe');
    fireEvent.click(within(drawer).getByTestId('candidate-reject'));
    const dialog = await screen.findByRole('dialog', { name: 'Reject 1 candidate?' });
    fireEvent.change(within(dialog).getByTestId('reject-note'), { target: { value: '  Closed down ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('1 candidate rejected.'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reject 1 candidate?' })).toBeNull());
    await waitFor(() => expect(within(drawer).getByTestId('candidate-reject')).toBeDisabled());
    expect(within(drawer).getByTestId('candidate-approve')).toBeDisabled();
    expect(drawer).toHaveTextContent('Closed down');
  });
});
