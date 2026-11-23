import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import LeadQualityHeaderRing from '@/components/lead-quality-tab/LeadQualityHeaderRing';
import { LEAD_QUALITY } from '@/api/leadQuality.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { LEAD_ID, details, qualityMock, qualityVars } from './fixtures';

const renderRing = (mocks: MockedResponse[], route = '/venue-leads/venue-1/view?selectedtab=contacts') =>
  renderWithApollo(<LeadQualityHeaderRing entity="VENUE_LEAD" leadId={LEAD_ID} />, mocks, { route });

describe('LeadQualityHeaderRing', () => {
  it('holds the space while loading, then shows the lead score as a large ring', async () => {
    renderRing([qualityMock(details())]);

    expect(screen.getByTestId('lead-quality-header-loading')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Quality score 70 out of 100, Good' })).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('selects the Quality Score tab in the URL when clicked, keeping the rest of the query', async () => {
    renderRing([qualityMock(details())], '/venue-leads/venue-1/view?selectedtab=contacts&from=list');

    fireEvent.click(await screen.findByRole('button', { name: 'Open the quality score breakdown (70/100)' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads/venue-1/view?selectedtab=quality&from=list');
  });

  it('shows a not-scored ring for a lead that was never scored', async () => {
    renderRing([qualityMock(details({ result: null, scored_version: null, scored_at: null, stale: true }))]);
    expect(await screen.findByRole('img', { name: 'Not scored yet' })).toBeInTheDocument();
  });

  it('shows nothing when the score cannot be loaded (the tab carries the error)', async () => {
    renderRing([{ request: { query: LEAD_QUALITY, variables: qualityVars }, error: new Error('Quality service is down') }]);

    await waitFor(() => expect(screen.queryByTestId('lead-quality-header-loading')).not.toBeInTheDocument());
    expect(screen.queryByTestId('lead-quality-header-ring')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
