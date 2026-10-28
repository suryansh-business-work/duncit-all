import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteAdminCity } from '../../../../graphql/catalogue';
import { CityForm, type CityFormValues } from '../../../../pages/cities/city';
import { makeCity } from '../../../fixtures';

type Submit = (values: CityFormValues) => Promise<void>;

const form = ({ initial = null, busy = false, onSubmit = vi.fn<Submit>(() => Promise.resolve()), onClose = vi.fn() }: { initial?: LiteAdminCity | null; busy?: boolean; onSubmit?: Submit; onClose?: () => void } = {}) => (
  <CityForm open initial={initial} busy={busy} onClose={onClose} onSubmit={onSubmit} />
);

describe('CityForm', () => {
  it('opens empty as New city with Asia & Pacific preselected', () => {
    render(form());
    expect(screen.getByRole('dialog', { name: 'New city' })).toBeInTheDocument();
    expect(screen.getByTestId('city-name')).toHaveValue('');
    expect(screen.getByTestId('city-sort-order')).toHaveValue('0');
    expect(screen.getByTestId('city-region')).toHaveTextContent('Asia & Pacific');
    expect(screen.getByLabelText('Active')).toBeChecked();
    expect(screen.getByLabelText('Featured')).not.toBeChecked();
  });

  it('offers exactly the five regions, labelled, in display order', async () => {
    const user = userEvent.setup();
    render(form());
    await user.click(screen.getByTestId('city-region'));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Asia & Pacific', 'Europe', 'Africa', 'North America', 'South America']);
  });

  it('submits the typed city with the picked region', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.type(screen.getByTestId('city-name'), 'Lisbon');
    await user.type(screen.getByTestId('city-country'), 'Portugal');
    await user.click(screen.getByTestId('city-region'));
    await user.click(await screen.findByRole('option', { name: 'Europe' }));
    await user.click(screen.getByLabelText('Featured'));
    await user.click(screen.getByTestId('city-dialog-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: 'Lisbon', slug: '', country: 'Portugal', region: 'EUROPE', cover_url: '', featured: true, sort_order: '0', is_active: true });
  });

  it('fills the stored city when editing', () => {
    render(form({ initial: makeCity({ region: 'AFRICA' }) }));
    expect(screen.getByRole('dialog', { name: 'Edit Bengaluru' })).toBeInTheDocument();
    expect(screen.getByTestId('city-name')).toHaveValue('Bengaluru');
    expect(screen.getByTestId('city-cover-preview')).toHaveAttribute('src', 'https://img.example.com/blr.jpg');
    expect(screen.getByTestId('city-region')).toHaveTextContent('Africa');
    expect(screen.getByTestId('city-sort-order')).toHaveValue('3');
  });

  it('refuses a missing name and a bad sort order without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    const sort = screen.getByTestId('city-sort-order');
    await user.clear(sort);
    await user.type(sort, '-4');
    await user.click(screen.getByTestId('city-dialog-submit'));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Sort order cannot be negative')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves the city without its cover once the picture is removed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ initial: makeCity(), onSubmit }));
    await user.click(screen.getByRole('button', { name: 'Remove picture' }));
    expect(screen.queryByTestId('city-cover-preview')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('city-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ name: 'Bengaluru', cover_url: '' });
  });

  it('locks every field while saving', () => {
    render(form({ busy: true }));
    for (const id of ['city-name', 'city-slug', 'city-country', 'city-cover-pick', 'city-sort-order', 'city-featured', 'city-active']) {
      expect(screen.getByTestId(id), id).toBeDisabled();
    }
  });
});
