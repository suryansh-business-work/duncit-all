import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import GrievanceInfoPage from '../../src/pages/grievance/GrievanceInfoPage';
import { renderWithProviders } from '../testkit';
import {
  grievanceOfficerMock,
  makeGrievanceOfficer,
  saveGrievanceOfficerErrorMock,
  saveGrievanceOfficerMock,
} from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

/**
 * The published Grievance Officer: one record, always editable, saved only
 * once something about it changed.
 */
const UNPUBLISHED = makeGrievanceOfficer({ name: '', email: '', phone: '', address: '', updated_at: null });

const renderPage = (mocks: MockedResponse[]) => renderWithProviders(<GrievanceInfoPage />, { mocks });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('GrievanceInfoPage', () => {
  it('shows the published officer and when the details last changed', async () => {
    renderPage([grievanceOfficerMock()]);

    expect(await screen.findByDisplayValue('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('grievance@duncit.com')).toBeInTheDocument();
    expect(screen.getByText(/^Last updated /)).toBeInTheDocument();
    expect(screen.queryByText(/No Grievance Officer is published yet/)).not.toBeInTheDocument();
    // Nothing has been edited, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('warns while no officer is published', async () => {
    renderPage([grievanceOfficerMock(UNPUBLISHED)]);

    expect(await screen.findByText(/No Grievance Officer is published yet/)).toBeInTheDocument();
    expect(screen.queryByText(/^Last updated /)).not.toBeInTheDocument();
  });

  it('saves a changed detail and reads the record back', async () => {
    renderPage([
      grievanceOfficerMock(),
      saveGrievanceOfficerMock(makeGrievanceOfficer({ phone: '+91 99000 11223' })),
      grievanceOfficerMock(makeGrievanceOfficer({ phone: '+91 99000 11223' })),
    ]);
    const phone = await screen.findByDisplayValue('+91 98765 43210');
    fireEvent.change(phone, { target: { value: '+91 99000 11223' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Grievance Officer updated'));
    expect(await screen.findByDisplayValue('+91 99000 11223')).toBeInTheDocument();
  });

  it("shows the server's reason when the save is refused", async () => {
    renderPage([
      grievanceOfficerMock(),
      saveGrievanceOfficerErrorMock('Only a Legal admin can change the Grievance Officer'),
    ]);
    const phone = await screen.findByDisplayValue('+91 98765 43210');
    fireEvent.change(phone, { target: { value: '+91 99000 11223' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Only a Legal admin can change the Grievance Officer'),
    ).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
