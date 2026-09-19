import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import LeadSurveyEntriesTable from '@/components/lead-survey/LeadSurveyEntriesTable';
import type { LeadSurveyDef, LeadSurveyEntry } from '@/components/lead-survey/queries';
import { entry, venueSurvey } from './fixtures';

const manual = entry({
  id: 'e-manual',
  source: 'MANUAL',
  filled: true,
  generated_by: 'Priya (CRM)',
  submitted_at: '2026-09-11T11:00:00.000Z',
  submitted_by: 'Priya (CRM)',
  answers: [
    { qid: 'q1', value: 'Grand Hall', values: [] },
    { qid: 'q2', value: null, values: ['Parking', 'Wi-Fi'] },
    { qid: 'q4', value: '', values: [] },
    { qid: 'legacy-q', value: 'Kept from an old survey', values: [] },
  ],
});
const liveLink = entry({ id: 'e-link', source: 'LINK', token: 'tok-live' });
const revokedLink = entry({ id: 'e-revoked', source: 'LINK', token: 'tok-old', token_revoked: true });
const appEntry = entry({ id: 'e-app', source: 'APP', filled: true, created_at: null });

const writeText = vi.fn(() => Promise.resolve());

const renderTable = (entries: LeadSurveyEntry[], survey: LeadSurveyDef | null = venueSurvey) => {
  const handlers = { onRevoke: vi.fn(), onDelete: vi.fn(), onFill: vi.fn() };
  render(<LeadSurveyEntriesTable entries={entries} survey={survey} revoking={false} deleting={false} {...handlers} />);
  return handlers;
};

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
  writeText.mockClear();
});

describe('LeadSurveyEntriesTable', () => {
  it('invites the first fill when nothing has been generated', () => {
    renderTable([]);
    expect(screen.getByText('No surveys generated yet. Click “Fill manually” or “Generate link”.')).toBeInTheDocument();
  });

  it('shows each entry’s source, status and who generated / submitted it', () => {
    renderTable([manual, liveLink, revokedLink, appEntry]);

    const rows = screen.getAllByTestId('crm-lead-survey-entry-row');
    expect(within(rows[0]).getByText('Filled')).toBeInTheDocument();
    expect(within(rows[0]).getByText('by Priya (CRM)')).toBeInTheDocument();
    expect(within(rows[0]).getByText(formatDateTime('2026-09-11T11:00:00.000Z'))).toBeInTheDocument();
    expect(within(rows[1]).getByText('Pending')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Revoked')).toBeInTheDocument();
    expect(within(rows[3]).getAllByText('—')).toHaveLength(2);
  });

  it('copies and revokes a live link, but offers neither for a revoked one', () => {
    const { onRevoke } = renderTable([liveLink, revokedLink]);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/s/tok-live`);

    const revokes = screen.getAllByTestId('crm-lead-survey-revoke');
    expect(revokes).toHaveLength(1);
    fireEvent.click(revokes[0]);
    expect(onRevoke).toHaveBeenCalledWith('e-link');
  });

  it('deletes without opening the row', () => {
    const { onDelete, onFill } = renderTable([liveLink]);
    fireEvent.click(screen.getByTestId('crm-lead-survey-delete'));
    expect(onDelete).toHaveBeenCalledWith('e-link');
    expect(onFill).not.toHaveBeenCalled();
  });

  it('opens a row by click, Enter or Space — but not for keys pressed inside it', () => {
    const { onFill } = renderTable([liveLink]);
    const row = screen.getByTestId('crm-lead-survey-entry-row');

    fireEvent.click(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    fireEvent.keyDown(row, { key: 'Tab' });
    fireEvent.keyDown(screen.getByTestId('crm-lead-survey-delete'), { key: 'Enter' });

    expect(onFill).toHaveBeenCalledTimes(3);
    expect(onFill).toHaveBeenCalledWith(liveLink);
  });

  it('lists the recorded answers under their question labels', async () => {
    renderTable([manual]);

    fireEvent.click(screen.getByRole('button', { name: 'View answers' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Survey answers' }));

    expect(dialog.getByText('Venue name')).toBeInTheDocument();
    expect(dialog.getByText('Grand Hall')).toBeInTheDocument();
    expect(dialog.getByText('Parking, Wi-Fi')).toBeInTheDocument();
    expect(dialog.getByText('Anything else')).toBeInTheDocument();
    expect(dialog.getByText('—')).toBeInTheDocument();
    // A question no longer on the survey is shown by its id.
    expect(dialog.getByText('legacy-q')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says when a filled entry carries no answers, even without a survey to label them', async () => {
    renderTable([appEntry], null);
    fireEvent.click(screen.getByRole('button', { name: 'View answers' }));
    expect(await screen.findByText('No answers recorded.')).toBeInTheDocument();
  });

  it('labels answers by id when the lead no longer has a survey', async () => {
    renderTable([{ ...manual, answers: [{ qid: 'q1', value: 'Grand Hall', values: [] }] }], null);
    fireEvent.click(screen.getByRole('button', { name: 'View answers' }));
    expect(await screen.findByText('q1')).toBeInTheDocument();
  });
});
