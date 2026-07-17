import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import NavItemDialog from '../../src/pages/website/navigation/NavItemDialog';
import { renderWithProviders } from '../testkit';
import { makeNavItem } from '../mocks';

const item = makeNavItem({
  site: 'PARTNERS',
  area: 'HEADER',
  label: 'Careers',
  url: '/careers',
  sort_order: 3,
  is_active: false,
});

describe('NavItemDialog', () => {
  it('is closed (renders no dialog) when open is false', () => {
    renderWithProviders(
      <NavItemDialog open={false} item={null} defaultSite="MAIN" onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a new link seeded with the active site tab', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithProviders(
      <NavItemDialog open item={null} defaultSite="ADS" onClose={onClose} onSave={onSave} />,
    );
    expect(screen.getByText('Add navigation link')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: 'Pricing' } });
    fireEvent.change(within(dialog).getByLabelText(/URL/), { target: { value: '/pricing' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ site: 'ADS', label: 'Pricing', url: '/pricing' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edits an existing link and toggles fields', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <NavItemDialog open item={item} defaultSite="MAIN" onClose={vi.fn()} onSave={onSave} />,
    );
    expect(screen.getByText('Edit navigation link')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Careers')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Sort order/), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ label: 'Careers', is_active: true });
  });

  it('blocks saving and shows validation errors on every field', async () => {
    const onSave = vi.fn();
    renderWithProviders(
      <NavItemDialog open item={null} defaultSite="MAIN" onClose={vi.fn()} onSave={onSave} />,
    );
    const dialog = screen.getByRole('dialog');
    // Over-long group label and a negative sort order surface their own helper
    // errors (the `fieldState.error?.message` branch on those fields).
    fireEvent.change(within(dialog).getByLabelText(/Group/), { target: { value: 'x'.repeat(61) } });
    fireEvent.change(within(dialog).getByLabelText(/Sort order/), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Label is required')).toBeInTheDocument();
    expect(screen.getByText('URL is required')).toBeInTheDocument();
    expect(screen.getByText('Max 60 characters')).toBeInTheDocument();
    expect(screen.getByText('Must be 0 or more')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('changes the site and area selects', async () => {
    renderWithProviders(
      <NavItemDialog open item={null} defaultSite="MAIN" onClose={vi.fn()} onSave={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    const combos = within(dialog).getAllByRole('combobox');
    fireEvent.mouseDown(combos[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'ads.duncit.com' }));
    fireEvent.mouseDown(within(dialog).getAllByRole('combobox')[1]);
    fireEvent.click(await screen.findByRole('option', { name: 'HEADER' }));
    expect(within(dialog).getByText('ads.duncit.com')).toBeInTheDocument();
  });
});
