import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { enrollCountErrorMock, enrollCountMock, enrollLeadsErrorMock, enrollLeadsMock, makeOutreachSequence } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import EnrollDialog from '../../src/pages/outreach-page/enroll-form/EnrollDialog';
import EnrollForm, { ENROLLABLE_STAGES, toLeadFilter } from '../../src/pages/outreach-page/enroll-form';
import EnrollFormDirect from '../../src/pages/outreach-page/enroll-form/enroll.form';
import type { OutreachSequence } from '../../src/pages/outreach-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const VENUE_FILTER = { pipeline: 'VENUE' as const, stage: null, city: null };
const ANY_FILTER = { pipeline: null, stage: null, city: null };

const setup = (sequence: OutreachSequence | null, mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  const onEnrolled = vi.fn();
  renderWithProviders(<EnrollDialog sequence={sequence} onClose={onClose} onEnrolled={onEnrolled} />, { mocks });
  return { onClose, onEnrolled };
};

describe('the enroll-form entry point', () => {
  it('hands out the form and its helpers from one place', () => {
    expect(EnrollForm).toBe(EnrollFormDirect);
    expect(ENROLLABLE_STAGES).not.toContain('LOST');
    expect(toLeadFilter({ pipeline: '', stage: '', city: '' })).toEqual(ANY_FILTER);
  });
});

describe('EnrollDialog', () => {
  it('stays closed without a sequence', () => {
    setup(null, []);
    expect(screen.queryByTestId('enroll-dialog')).not.toBeInTheDocument();
  });

  it('locks a one-pipeline sequence to its pipeline and counts the leads it would take', async () => {
    setup(makeOutreachSequence(), [enrollCountMock('seq1', VENUE_FILTER, 7)]);
    const dialog = screen.getByRole('dialog', { name: 'Enroll leads in Venue intro' });
    expect(within(dialog).getByTestId('enroll-count')).toHaveTextContent('Counting leads…');
    expect(await within(dialog).findByText('7 leads would be enrolled now.')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /^Pipeline/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).getByText('This sequence only takes this pipeline.')).toBeInTheDocument();
    expect(within(dialog).getByTestId('enroll-submit')).toBeEnabled();
  });

  it('recounts as the filter narrows, offers only open stages and will not enroll nobody', async () => {
    const anyPipeline = makeOutreachSequence({ pipeline: null });
    setup(anyPipeline, [
      enrollCountMock('seq1', ANY_FILTER, 9),
      enrollCountMock('seq1', { ...ANY_FILTER, stage: 'NEW' }, 3),
      enrollCountMock('seq1', { ...ANY_FILTER, stage: 'NEW', city: 'Pune' }, 0),
    ]);
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('9 leads would be enrolled now.')).toBeInTheDocument();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /^Stage/ }));
    const stages = within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent);
    expect(stages).toEqual(['Any open stage', 'New', 'Contacted', 'Replied', 'Qualified']);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'New' }));
    expect(await within(dialog).findByText('3 leads would be enrolled now.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'City' }), { target: { value: 'Pune' } });
    expect(await within(dialog).findByText('0 leads would be enrolled now.')).toBeInTheDocument();
    expect(within(dialog).getByTestId('enroll-submit')).toBeDisabled();
  });

  it('enrolls, says how many joined, were already in or were not taken, and closes', async () => {
    const { onClose, onEnrolled } = setup(makeOutreachSequence(), [
      enrollCountMock('seq1', VENUE_FILTER, 7),
      enrollLeadsMock('seq1', VENUE_FILTER, { enrolled: 5, already: 1, skipped: 1 }),
    ]);
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText('7 leads would be enrolled now.');
    fireEvent.click(within(dialog).getByTestId('enroll-submit'));
    expect(await within(dialog).findByTestId('enroll-result')).toHaveTextContent('5 enrolled, 1 already in the sequence, 1 not taken.');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Leads enrolled.', 'success');
    expect(onEnrolled).toHaveBeenCalledTimes(1);
    expect(within(dialog).queryByTestId('enroll-form')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('enroll-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports a refused enroll and keeps the form', async () => {
    const { onEnrolled } = setup(makeOutreachSequence(), [
      enrollCountMock('seq1', VENUE_FILTER, 7),
      enrollLeadsErrorMock('seq1', VENUE_FILTER, 'Access denied'),
    ]);
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText('7 leads would be enrolled now.');
    fireEvent.click(within(dialog).getByTestId('enroll-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Access denied', 'error'));
    expect(onEnrolled).not.toHaveBeenCalled();
    expect(within(dialog).getByTestId('enroll-form')).toBeInTheDocument();
  });

  it('says when the leads could not be counted, and refuses a city that is too long', async () => {
    setup(makeOutreachSequence(), [enrollCountErrorMock('seq1', VENUE_FILTER, 'Count failed'), enrollCountErrorMock('seq1', { ...VENUE_FILTER, city: 'x'.repeat(81) }, 'Count failed')]);
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Count failed')).toBeInTheDocument();
    expect(within(dialog).queryByTestId('enroll-count')).not.toBeInTheDocument();
    expect(within(dialog).getByTestId('enroll-submit')).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'City' }), { target: { value: 'x'.repeat(81) } });
    expect(await within(dialog).findByText('Keep it under 80 characters.')).toBeInTheDocument();
  });
});
