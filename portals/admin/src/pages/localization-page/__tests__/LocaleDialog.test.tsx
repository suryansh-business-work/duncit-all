import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import LocaleDialog from '../LocaleDialog';
import type { LocaleRow } from '../queries';

const row = (over: Partial<LocaleRow> = {}): LocaleRow => ({
  id: 'l1',
  code: 'en-IN',
  label: 'English',
  english_label: 'English (India)',
  is_rtl: false,
  is_active: true,
  is_default: true,
  sort_order: 0,
  updated_at: '2026-01-02T00:00:00.000Z',
  ...over,
});

const open = (props: Partial<React.ComponentProps<typeof LocaleDialog>> = {}) => {
  const onSubmit = vi.fn();
  renderWithProviders(
    <LocaleDialog
      open
      editing={null}
      saving={false}
      onClose={vi.fn()}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return onSubmit;
};

/** The picker’s input. Role rather than label: once the list is open the
 * outlined-input legend carries the same words. */
const picker = () => screen.getByRole('combobox');

describe('LocaleDialog — adding a language', () => {
  it('offers the ISO catalogue and fills the whole row from one pick', async () => {
    const onSubmit = open();
    fireEvent.change(picker(), { target: { value: 'Hindi' } });

    // Searching by English name finds the tag, which is what a locale row is.
    const option = await screen.findByText('हिन्दी (भारत)');
    fireEvent.click(option);

    await waitFor(() => expect(picker()).toHaveValue('hi-IN'));
    expect(screen.getByLabelText(/Language name/i)).toHaveValue('हिन्दी (भारत)');
    expect(screen.getByLabelText(/English name/i)).toHaveValue('Hindi (India)');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      code: 'hi-IN',
      label: 'हिन्दी (भारत)',
      english_label: 'Hindi (India)',
      is_rtl: false,
      is_default: false,
    });
  });

  // A right-to-left language must not need the admin to know it is one.
  it('sets the writing direction from the language that was picked', async () => {
    const onSubmit = open();
    fireEvent.change(picker(), { target: { value: 'ar-AE' } });
    fireEvent.click(await screen.findByText('العربية (الإمارات العربية المتحدة)'));

    await waitFor(() => expect(picker()).toHaveValue('ar-AE'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ code: 'ar-AE', is_rtl: true });
  });

  it('refuses a code that is not a BCP-47 tag', async () => {
    const onSubmit = open();
    fireEvent.change(picker(), { target: { value: '!!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/BCP-47 tag/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('LocaleDialog — the default language', () => {
  it('locks the default and active switches on the source language', () => {
    open({ editing: row() });

    expect(screen.getByText(/It cannot be switched off or removed/)).toBeInTheDocument();
    const locked = screen.getAllByLabelText('Locked while this is the default language');
    expect(locked).toHaveLength(2);
    for (const control of locked) expect(control).toBeDisabled();

    // Direction is still editable — it is not what makes a locale the default.
    expect(screen.getByLabelText('Right-to-left script')).not.toBeDisabled();
  });

  it('leaves every switch usable on a language that is not the default', () => {
    open({ editing: row({ code: 'hi-IN', is_default: false }) });

    expect(screen.queryByText(/It cannot be switched off or removed/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Active — offered in the language switcher/)).not.toBeDisabled();
    expect(screen.getByLabelText(/Default language/)).not.toBeDisabled();
  });

  it('shows the code read-only when editing, because profiles are stored against it', () => {
    open({ editing: row({ code: 'ta-IN', is_default: false }) });
    const code = screen.getByLabelText(/Locale code/i);
    expect(code).toHaveValue('ta-IN');
    expect(code).toBeDisabled();
    expect(screen.getByText(/cannot be changed/)).toBeInTheDocument();
  });

  it('submits the row it was opened on', async () => {
    const onSubmit = open({ editing: row({ code: 'hi-IN', label: 'हिन्दी', is_default: false }) });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ code: 'hi-IN', label: 'हिन्दी' });
  });

  it('reports that it is saving and stops a second submit', () => {
    open({ editing: row({ is_default: false }), saving: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('LocalePicker', () => {
  it('searches by tag, by English name and by the language’s own name', async () => {
    open();
    const listFor = async (query: string) => {
      fireEvent.change(picker(), { target: { value: query } });
      const list = await screen.findByRole('listbox');
      return within(list).getAllByRole('option').length;
    };
    expect(await listFor('ta-IN')).toBeGreaterThan(0);
    expect(await listFor('Tamil')).toBeGreaterThan(0);
    expect(await listFor('தமிழ்')).toBeGreaterThan(0);
  });

  // The shipped list is a shortlist of region tags plus every ISO 639-1
  // language; a market outside it must not need a release.
  it('accepts a tag typed by hand that the list does not carry', async () => {
    const onSubmit = open();
    fireEvent.change(picker(), { target: { value: 'es-CO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      code: 'es-CO',
      english_label: 'Spanish (Colombia)',
    });
  });
});
