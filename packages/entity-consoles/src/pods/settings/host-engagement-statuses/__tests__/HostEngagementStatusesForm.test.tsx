import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HostEngagementStatusesForm from '../host-engagement-statuses.form';
// The schema and input-mapping suite lives beside the form (the form folder's
// .form.cy.tsx); importing it registers those cases in this run too, since the
// package's vitest include only walks __tests__ folders.
import '../host-engagement-statuses.form.cy';

const INVALID = 'Every status needs a label of up to 40 characters, and at least one must stay offered.';

const SAVED = [
  { key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
  { key: 'CONTACTED', label: 'Contacted', is_active: true },
  { key: 'INACTIVE', label: 'Inactive', is_active: false },
];

describe('HostEngagementStatusesForm', () => {
  const renderForm = (onSave = vi.fn(async () => undefined)) => {
    render(<HostEngagementStatusesForm value={SAVED} loading={false} onSave={onSave} />);
    return onSave;
  };

  it('shows each saved status with its permanent key and no remove button', () => {
    renderForm();
    expect(screen.getByTestId('host-status-label-0')).toHaveValue('Not Contacted');
    expect(screen.getByText('Key: INACTIVE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.getByTestId('pod-settings-host-statuses-save')).toBeDisabled();
  });

  it('renames, reorders and saves the whole list', async () => {
    const onSave = renderForm();
    fireEvent.change(screen.getByTestId('host-status-label-1'), { target: { value: 'Spoke to them' } });
    const firstRow = screen.getByTestId('host-status-row-0');
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Move down' }));
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      host_engagement_statuses: [
        { key: 'CONTACTED', label: 'Spoke to them', is_active: true },
        { key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
        { key: 'INACTIVE', label: 'Inactive', is_active: false },
      ],
    });
  });

  it('adds a new status that can be removed before saving', async () => {
    const onSave = renderForm();
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-add'));
    expect(screen.getByText('New')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-add'));
    fireEvent.change(screen.getByTestId('host-status-label-3'), { target: { value: 'Needs a venue' } });
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      host_engagement_statuses: [...SAVED, { label: 'Needs a venue', is_active: true }],
    });
  });

  it('blocks a save with an unlabelled new row and shows the server error when a save fails', async () => {
    const onSave = renderForm(vi.fn(async () => Promise.reject(new Error('At least one status must stay active.'))));
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-add'));
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-save'));
    expect(await screen.findByText(INVALID)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('host-status-label-3'), { target: { value: 'Later' } });
    fireEvent.click(screen.getByTestId('pod-settings-host-statuses-save'));
    expect(await screen.findByText('At least one status must stay active.')).toBeInTheDocument();
  });
});
