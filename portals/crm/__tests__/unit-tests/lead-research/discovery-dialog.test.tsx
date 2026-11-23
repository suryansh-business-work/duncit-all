import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { START_LEAD_DISCOVERY } from '@/api/leadResearch.gql';
import DiscoveriesPanel from '@/pages/lead-research/DiscoveriesPanel';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { anyVariables, job, jobsMock } from './fixtures';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

vi.mock('@duncit/location', async (importOriginal) => {
  const { ADMIN_LOCATIONS } = await import('./helpers');
  return {
    ...(await importOriginal<typeof import('@duncit/location')>()),
    useAdminLocations: () => ({ loading: false, locations: ADMIN_LOCATIONS }),
  };
});

const pickMumbai = async () => {
  const city = within(screen.getByTestId('lead-discovery-form')).getByRole('combobox', { name: /^City/ });
  fireEvent.mouseDown(city);
  fireEvent.click(within(await screen.findByRole('listbox')).getByText('Mumbai'));
};

beforeEach(() => {
  notifySuccess.mockClear();
});

describe('Lead Research › discover leads dialog', () => {
  it('starts a discovery with what was entered and confirms it started', async () => {
    const started = job({ id: 'job3', status: 'RUNNING', label: 'Discover 20 venue leads in Mumbai', finished_at: null, failures: [] });
    const variables = vi.fn(() => true);
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([]),
      { request: { query: START_LEAD_DISCOVERY, variables }, result: { data: { startCrmLeadDiscovery: started } } },
      jobsMock([started]),
    ]);

    fireEvent.click(await screen.findByTestId('discover-leads'));
    expect(screen.getByRole('dialog', { name: 'Discover leads' })).toBeInTheDocument();
    await pickMumbai();
    fireEvent.click(screen.getByTestId('lead-discovery-submit'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Discover 20 venue leads in Mumbai started. Follow its progress here or in the header.'));
    expect(variables).toHaveBeenCalledWith({
      input: {
        lead_type: 'VENUE_LEAD',
        city: 'Mumbai',
        locality: null,
        category: null,
        keywords: null,
        target_count: 20,
        min_score: null,
        sources: null,
        ai_evidence: true,
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Discover leads' })).toBeNull());
    expect(await screen.findByTestId('discovery-job-job3')).toBeInTheDocument();
  });

  it('calls out a missing Serper key instead of a generic error', async () => {
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([]),
      {
        request: { query: START_LEAD_DISCOVERY, variables: anyVariables },
        result: { errors: [{ message: 'Lead discovery needs the Serper API key (Tech › Environment › SERPER).', extensions: { code: 'NOT_CONFIGURED' } }] },
      },
    ]);

    fireEvent.click(await screen.findByTestId('discover-leads'));
    await pickMumbai();
    fireEvent.click(screen.getByTestId('lead-discovery-submit'));

    const alert = await screen.findByTestId('discovery-not-configured');
    expect(alert).toHaveTextContent('Lead discovery is not set up');
    expect(alert).toHaveTextContent('Ask an admin to add it in Tech › Environment › SERPER.');
    expect(screen.queryByTestId('discovery-error')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Discover leads' })).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the server’s reason for any other refusal', async () => {
    renderWithApollo(<DiscoveriesPanel onShowCandidates={vi.fn()} />, [
      jobsMock([]),
      {
        request: { query: START_LEAD_DISCOVERY, variables: anyVariables },
        result: { errors: [{ message: 'You already have 2 discoveries running.', extensions: { code: 'CONFLICT' } }] },
      },
    ]);

    fireEvent.click(await screen.findByTestId('discover-leads'));
    await pickMumbai();
    fireEvent.click(screen.getByTestId('lead-discovery-submit'));

    expect(await screen.findByTestId('discovery-error')).toHaveTextContent('You already have 2 discoveries running.');
    expect(screen.queryByTestId('discovery-not-configured')).toBeNull();
  });
});
