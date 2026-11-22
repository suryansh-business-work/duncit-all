import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import LeadQualityTab from '@/components/lead-quality-tab/LeadQualityTab';
import { RECORD_LEAD_EVIDENCE } from '@/api/leadQuality.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { LEAD_ID, details, historyMock, qualityMock, qualityVars, rescored } from './fixtures';

const renderTab = (mocks: MockedResponse[]) => renderWithApollo(<LeadQualityTab entity="VENUE_LEAD" leadId={LEAD_ID} />, mocks);

const verifiedBooking = {
  item_key: 'website.booking',
  status: 'VERIFIED',
  evidence: 'Booking widget on the venue site',
  source_url: 'https://grandhall.example/book',
  notes: 'Checked twice',
};

/** Opens the evidence dialog for the website's "Online booking" item. */
async function openBookingEvidence() {
  fireEvent.click(await screen.findByRole('button', { name: 'Show the items of Website' }));
  fireEvent.click(screen.getByRole('button', { name: 'Record evidence for Online booking' }));
  return screen.getByRole('dialog', { name: 'Record evidence' });
}

function decideVerified(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByRole('combobox', { name: 'Decision' }), { target: { value: 'VERIFIED' } });
  fireEvent.change(within(dialog).getByTestId('lead-evidence-evidence'), { target: { value: verifiedBooking.evidence } });
  fireEvent.change(within(dialog).getByTestId('lead-evidence-source_url'), { target: { value: verifiedBooking.source_url } });
  fireEvent.click(within(dialog).getByTestId('lead-evidence-submit'));
}

describe('Recording evidence from the Quality Score tab', () => {
  it('prefills the recorded decision, saves the new one and shows the rescored lead', async () => {
    const save = vi.fn(() => ({ data: { recordCrmLeadEvidence: { skipped_checks: [], details: rescored() } } }));
    renderTab([
      qualityMock(details()),
      historyMock([]),
      { request: { query: RECORD_LEAD_EVIDENCE, variables: { ...qualityVars, decisions: [verifiedBooking] } }, result: save },
    ]);

    const dialog = await openBookingEvidence();
    expect(dialog).toHaveTextContent('Online booking · 20 points');
    expect(within(dialog).getByRole('combobox', { name: 'Decision' })).toHaveValue('FAILED');
    expect(within(dialog).getByTestId('lead-evidence-evidence')).toHaveValue('No booking page on the site');
    expect(within(dialog).getByTestId('lead-evidence-notes')).toHaveValue('Checked twice');

    decideVerified(dialog);

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Record evidence' })).not.toBeInTheDocument());
    expect(await screen.findByRole('img', { name: 'Quality score 80 out of 100, Excellent' })).toBeInTheDocument();
  });

  it('keeps the dialog open and lists every problem when the server refuses the decision', async () => {
    const problems = ['website.booking: the source must be an http(s) link.', 'website.booking: sent twice.'];
    renderTab([
      qualityMock(details()),
      historyMock([]),
      {
        request: { query: RECORD_LEAD_EVIDENCE, variables: { ...qualityVars, decisions: [verifiedBooking] } },
        result: { errors: [{ message: problems[0], extensions: { code: 'BAD_USER_INPUT', errors: problems } }] },
      },
    ]);

    const dialog = await openBookingEvidence();
    decideVerified(dialog);

    const refused = await within(dialog).findByTestId('lead-evidence-refused');
    expect(refused).toHaveTextContent('The evidence was not saved:');
    expect(within(refused).getAllByRole('listitem').map((item) => item.textContent)).toEqual(problems);
    expect(screen.getByRole('dialog', { name: 'Record evidence' })).toBeInTheDocument();
    // The score behind the open (modal) dialog is unchanged.
    expect(screen.getByRole('img', { name: 'Quality score 70 out of 100, Good', hidden: true })).toBeInTheDocument();
  });

  it('does not send a verified decision without its evidence', async () => {
    const save = vi.fn(() => ({ data: { recordCrmLeadEvidence: { skipped_checks: [], details: rescored() } } }));
    renderTab([
      qualityMock(details()),
      historyMock([]),
      { request: { query: RECORD_LEAD_EVIDENCE, variables: () => true }, result: save },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Show the items of Instagram presence' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record evidence for Followers' }));
    const dialog = screen.getByRole('dialog', { name: 'Record evidence' });
    fireEvent.click(within(dialog).getByTestId('lead-evidence-submit'));

    expect(await within(dialog).findByText('Say what proves it (at least 3 characters).')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
