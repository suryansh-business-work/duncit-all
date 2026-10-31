import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { makeSettings } from '../mocks/occasions-live.mock';

import { LiveModeForm, liveModeValues } from '../../src/pages/occasions-page/live-mode-form';

const LOOKS = [
  { key: 'diwali', name: 'Diwali' },
  { key: 'holi', name: 'Holi' },
];

const open = (settings = makeSettings(), onSubmit = vi.fn().mockResolvedValue(true)) => {
  renderWithProviders(<LiveModeForm settings={settings} looks={LOOKS} onSubmit={onSubmit} />);
  return onSubmit;
};

const apply = () => screen.getByTestId('occasion-live-mode-save');

describe('liveModeValues', () => {
  it('takes the mode and the pinned look from the settings', () => {
    expect(liveModeValues(makeSettings({ mode: 'MANUAL', manual_key: 'holi' }))).toEqual({ mode: 'MANUAL', manual_key: 'holi' });
  });
});

describe('LiveModeForm', () => {
  it('offers the three modes with what each does, the saved one picked, and nothing to apply yet', () => {
    open(makeSettings({ mode: 'SCHEDULE' }));
    const group = screen.getByRole('radiogroup');
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Automatic by schedule/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Normal/ })).not.toBeChecked();
    expect(screen.getByText('One look stays on in every app until you change it.')).toBeInTheDocument();
    expect(screen.getByText('Live mode')).toBeInTheDocument();
    // The look picker belongs to pinning only.
    expect(screen.queryByLabelText(/^Look to pin/)).not.toBeInTheDocument();
    expect(apply()).toBeDisabled();
  });

  it('asks which look to pin before pinning', async () => {
    const onSubmit = open();
    fireEvent.click(screen.getByRole('radio', { name: /Pin a look/ }));
    expect(screen.getByText('Archived looks cannot be pinned.')).toBeInTheDocument();
    expect(apply()).toBeEnabled();
    fireEvent.click(apply());
    expect(await screen.findByText('Choose the look to pin.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pins the look picked from the list', async () => {
    const onSubmit = open();
    fireEvent.click(screen.getByRole('radio', { name: /Pin a look/ }));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual(['Diwali', 'Holi']);
    fireEvent.click(within(listbox).getByRole('option', { name: 'Holi' }));
    fireEvent.click(apply());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ mode: 'MANUAL', manual_key: 'holi' });
  });

  it('goes back to normal without asking for a look', async () => {
    const onSubmit = open(makeSettings({ mode: 'MANUAL', manual_key: 'diwali' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Diwali');
    fireEvent.click(screen.getByRole('radio', { name: /^Normal/ }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(apply());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ mode: 'NORMAL', manual_key: 'diwali' });
  });
});
