import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import LeadResearchPage from '@/pages/lead-research';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { candidate, candidateMock, duplicateCandidate, tableMock } from './fixtures';
import { openCandidate } from './helpers';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

beforeEach(() => {
  window.localStorage.clear();
  notifySuccess.mockClear();
});

describe('Lead Research › review queue listing and candidate drawer', () => {
  it('lists each candidate with its score ring, classification, qualification, contacts and duplicate flag', async () => {
    const noInstagram = { ...duplicateCandidate(), instagram_handle: '', instagram_url: '' };
    renderWithApollo(<LeadResearchPage />, [tableMock([candidate(), noInstagram])], { route: '/lead-research' });

    expect(screen.getByRole('heading', { name: 'Lead Research', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('The Barn Cafe')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Quality score 84 out of 100, Excellent' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Quality score 35 out of 100, Weak' })).toBeInTheDocument();
    expect(screen.getByText('Qualified')).toBeInTheDocument();
    expect(screen.getByText('Not qualified')).toBeInTheDocument();
    expect(screen.getByText('1 CRM match')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    // Only the first candidate has an Instagram profile to link to.
    expect(screen.getByRole('link', { name: '@thebarn' })).toHaveAttribute('href', 'https://instagram.com/thebarn');
    expect(screen.getAllByRole('link', { name: /@/ })).toHaveLength(1);
  });

  it('narrows the queue to one discovery named in the URL, and shows everything again on request', async () => {
    const variables = vi.fn(() => true);
    renderWithApollo(<LeadResearchPage />, [tableMock([candidate()], variables)], { route: '/lead-research?job=job1' });

    await screen.findByText('The Barn Cafe');
    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ filters: [{ field: 'job_id', op: 'eq', value: 'job1', values: null }], sort_by: 'created_at', sort_dir: 'desc' }),
      })
    );
    expect(screen.getByTestId('job-filter')).toHaveTextContent('Showing the candidates one discovery found.');

    fireEvent.click(screen.getByRole('button', { name: 'Show all candidates' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/lead-research$/));
    expect(screen.queryByTestId('job-filter')).toBeNull();
  });

  it('opens a candidate with its sources, breakdown, evidence, gaps and skipped checks', async () => {
    renderWithApollo(<LeadResearchPage />, [tableMock([candidate()]), candidateMock(candidate())], { route: '/lead-research' });

    const drawer = await openCandidate('The Barn Cafe');

    expect(within(drawer).getByRole('heading', { name: 'The Barn Cafe', level: 2 })).toBeInTheDocument();
    expect(within(drawer).getByRole('img', { name: 'Quality score 84 out of 100, Excellent' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'The Barn (@thebarn)' })).toHaveAttribute('href', 'https://instagram.com/thebarn');
    const breakdown = within(drawer).getByTestId('candidate-breakdown');
    expect(breakdown).toHaveTextContent('Not already in the CRM: Passed');
    expect(breakdown).toHaveTextContent('Online presence');
    expect(breakdown).toHaveTextContent('24 / 40');
    expect(breakdown).toHaveTextContent('Instagram business profile: 24 / 24 (Verified)');
    const evidence = within(drawer).getByTestId('candidate-evidence');
    expect(evidence).toHaveTextContent('Business profile with 4,200 followers');
    expect(evidence).toHaveTextContent('Discovery AI (quoted source)');
    expect(evidence).toHaveTextContent('Recorded by Discovery AI');
    expect(within(drawer).getByTestId('candidate-missing')).toHaveTextContent('Google reviews');
    expect(within(drawer).getByTestId('candidate-skipped')).toHaveTextContent('Instagram followers: Instagram did not answer');
    expect(within(drawer).queryByTestId('candidate-duplicates')).toBeNull();
  });

  it('links a duplicate to the CRM lead it matches and never offers to add it', async () => {
    const duplicate = duplicateCandidate();
    renderWithApollo(<LeadResearchPage />, [tableMock([duplicate]), candidateMock(duplicate)], { route: '/lead-research' });

    const drawer = await openCandidate('Hill Top Studio');

    const duplicates = within(drawer).getByTestId('candidate-duplicates');
    expect(duplicates).toHaveTextContent('Already in the CRM as 1 lead');
    expect(within(duplicates).getByRole('link', { name: 'Hill Top (host)' })).toHaveAttribute('href', '/host-leads/h7/view');
    expect(duplicates).toHaveTextContent('Host lead · matched on PHONE +91 90000 00001');
    expect(within(drawer).getByTestId('candidate-approve')).toBeDisabled();
  });
});
