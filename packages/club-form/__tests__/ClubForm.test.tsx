import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@duncit/category', () => import('./mocks/categoryMock'));
vi.mock('@duncit/location', () => import('./mocks/locationMock'));

import ClubForm from '../src/ClubForm';
import type { ClubFormConfig, ClubFormValues } from '../src/types';
import { blankClubFormValues } from '../src/types';

const config: ClubFormConfig = { showAdmins: false, showVerified: false, showIsActive: false };

function validValues(overrides: Partial<ClubFormValues> = {}): ClubFormValues {
  return {
    ...blankClubFormValues,
    club_name: 'My Club',
    club_description: 'A great club',
    super_category_id: 'S1',
    category_id: 'C1',
    location_id: 'L1',
    locality: 'Andheri',
    feature_text: 'https://x/a.jpg',
    community_link: 'https://chat.whatsapp.com/community',
    group_link: 'https://chat.whatsapp.com/group',
    who_we_are: ['friendly'],
    what_we_do: ['we meet'],
    perks: ['tea'],
    values: ['kindness'],
    ...overrides,
  };
}

function renderForm(props: Partial<React.ComponentProps<typeof ClubForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  const utils = render(
    <ClubForm initialValues={validValues()} config={config} onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  );
  return { onSubmit, onCancel, ...utils };
}

describe('ClubForm', () => {
  it('submits the values when the form is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ club_name: 'My Club' }), { draft: false });
  });

  it('blocks submit and surfaces section error chips when invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    // Name is filled (so Save is enabled) but everything else is missing.
    render(
      <ClubForm
        initialValues={{ ...blankClubFormValues, club_name: 'Named' }}
        config={config}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByText(/required$/).length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves a draft with the raw values (create mode only)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ club_name: 'My Club' }), { draft: true }));
  });

  it('swallows a rejected draft save', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('nope'));
    renderForm({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // No unhandled rejection — the component catches it.
  });

  it('hides the draft button while editing an existing club', () => {
    renderForm({ initialValues: validValues({ id: 'club-1' }) });
    expect(screen.queryByRole('button', { name: 'Save as Draft' })).not.toBeInTheDocument();
  });

  it('disables the actions when the name is empty', () => {
    renderForm({ initialValues: { ...blankClubFormValues, club_name: '' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeDisabled();
  });

  it('shows a busy label and disables actions while saving', () => {
    renderForm({ busy: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('renders the error alert when an error is passed', () => {
    renderForm({ error: 'Server exploded' });
    expect(screen.getByText('Server exploded')).toBeInTheDocument();
  });

  it('hands the RHF methods to onReady', () => {
    const onReady = vi.fn();
    renderForm({ onReady });
    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ handleSubmit: expect.any(Function) }));
  });

  it('calls onCancel from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('resets the form when initialValues change', () => {
    const { rerender } = renderForm();
    expect(screen.getByLabelText(/Club name/)).toHaveValue('My Club');
    rerender(
      <ClubForm initialValues={validValues({ club_name: 'Renamed Club' })} config={config} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByLabelText(/Club name/)).toHaveValue('Renamed Club');
  });
});
