import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { NotifyHost } from '@duncit/dialogs';
import RecalculateScoresAction from '@/components/lead-table/quality/RecalculateScoresAction';
import { RECALCULATE_LEAD_QUALITY_SCORES } from '@/api/leadQuality.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const request = { query: RECALCULATE_LEAD_QUALITY_SCORES, variables: { entity_type: 'VENUE_LEAD' } };

const renderAction = (mocks: MockedResponse[]) =>
  renderWithApollo(
    <>
      <RecalculateScoresAction entity="VENUE_LEAD" />
      <NotifyHost />
    </>,
    mocks,
  );

const openConfirm = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Recalculate scores' }));
  return screen.getByRole('dialog', { name: 'Recalculate quality scores?' });
};

describe('RecalculateScoresAction', () => {
  it('asks first, then starts the background rescore for this lead kind and says where to follow it', async () => {
    const start = vi.fn(() => ({ data: { recalculateCrmLeadQualityScores: { job_id: 'job-1', total: 12 } } }));
    renderAction([{ request, result: start }]);

    const dialog = openConfirm();
    expect(dialog).toHaveTextContent('Every Venue lead is rescored with the published criteria in the background.');
    expect(start).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Recalculate' }));

    expect(await screen.findByText('Rescoring 12 leads. Follow the progress in the header.')).toBeInTheDocument();
    expect(start).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Recalculate quality scores?' })).not.toBeInTheDocument());
  });

  it('starts nothing when the confirm is cancelled', async () => {
    const start = vi.fn(() => ({ data: { recalculateCrmLeadQualityScores: { job_id: 'job-1', total: 1 } } }));
    renderAction([{ request, result: start }]);

    fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(start).not.toHaveBeenCalled();
  });

  it('says so when there is no lead of the kind to score', async () => {
    renderAction([{ request, result: { data: { recalculateCrmLeadQualityScores: { job_id: null, total: 0 } } } }]);

    fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Recalculate' }));

    expect(await screen.findByText('There are no leads of this type to score.')).toBeInTheDocument();
  });

  it('shows why the rescore could not start and keeps the confirm open', async () => {
    renderAction([{ request, error: new Error('Only CRM managers can rescore') }]);

    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Recalculate' }));

    expect(await screen.findByText('The recalculation could not be started: Only CRM managers can rescore')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Recalculate quality scores?' })).toBeInTheDocument();
  });
});
