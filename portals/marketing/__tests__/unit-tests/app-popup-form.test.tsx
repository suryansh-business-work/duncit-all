import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { APP_POPUP_AUDIENCE_LISTS, makeAppPopupRow } from '../mocks';

// The ImageKit round-trip is swapped for two buttons; the MUI X picker for a
// plain input that still shows the helper text the form hands it.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({
    helperText,
    onChange,
  }: {
    helperText?: string;
    onChange: (url: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange('https://cdn.duncit.com/app-popups/new.jpg')}>
        upload-image
      </button>
      <button type="button" onClick={() => onChange('')}>
        remove-image
      </button>
      <span>{helperText}</span>
    </div>
  ),
}));

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    value,
    onChange,
    slotProps,
  }: {
    label: string;
    value: Date | null;
    onChange: (d: Date | null) => void;
    slotProps?: { textField?: { helperText?: string } };
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ? value.toISOString() : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      />
      <span>{slotProps?.textField?.helperText}</span>
    </div>
  ),
}));

import AppPopupForm, {
  blankAppPopupValues,
  toAppPopupInput,
  toAppPopupValues,
  type AppPopupFormValues,
} from '../../src/pages/app-popups-page/app-popup-form';

const DAY_MS = 24 * 60 * 60 * 1000;

const renderForm = (initialValues: AppPopupFormValues = blankAppPopupValues()) => {
  const onSubmit = vi.fn();
  renderWithProviders(
    <AppPopupForm
      audienceLists={APP_POPUP_AUDIENCE_LISTS}
      initialValues={initialValues}
      busy={false}
      errorMessage={null}
      submitLabel="Create popup"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
};

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AppPopupForm', () => {
  it('asks for the image again once it is removed', async () => {
    renderForm({ ...blankAppPopupValues(), image_url: 'https://cdn.duncit.com/app-popups/diwali.jpg' });
    expect(screen.getByText('Shown full-width when the app opens')).toBeInTheDocument();
    fireEvent.click(screen.getByText('remove-image'));
    expect(await screen.findByText('Upload the popup image')).toBeInTheDocument();
    fireEvent.click(screen.getByText('upload-image'));
    await waitFor(() => expect(screen.queryByText('Upload the popup image')).not.toBeInTheDocument());
  });

  it('wants a start date, and an end after it', async () => {
    renderForm();
    typeInto('Starts', '');
    expect(await screen.findByText('Pick a start date')).toBeInTheDocument();

    typeInto('Starts', new Date(Date.now() + DAY_MS).toISOString());
    await waitFor(() => expect(screen.queryByText('Pick a start date')).not.toBeInTheDocument());

    typeInto('Ends', new Date(Date.now() - DAY_MS).toISOString());
    expect(await screen.findByText('End date must be after the start date')).toBeInTheDocument();
    typeInto('Ends', new Date(Date.now() + 9 * DAY_MS).toISOString());
    await waitFor(() =>
      expect(screen.queryByText('End date must be after the start date')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('It stops on its own after this')).toBeInTheDocument();
  });

  // The button can leave the app, so its link is held to what the server takes.
  it('accepts an in-app path or an http(s) link for the button, and nothing else', async () => {
    renderForm();
    const invalid = 'Use a full https:// link or an in-app path like /earn';

    typeInto('CTA link', 'not a link');
    expect(await screen.findByText(invalid)).toBeInTheDocument();
    typeInto('CTA link', '/earn');
    await waitFor(() => expect(screen.queryByText(invalid)).not.toBeInTheDocument());
    typeInto('CTA link', 'ftp://duncit.com/earn');
    expect(await screen.findByText(invalid)).toBeInTheDocument();
    typeInto('CTA link', 'http://duncit.com/earn');
    await waitFor(() => expect(screen.queryByText(invalid)).not.toBeInTheDocument());
    typeInto('CTA link', 'ftp://duncit.com/earn');
    expect(await screen.findByText(invalid)).toBeInTheDocument();
    typeInto('CTA link', 'https://duncit.com/earn');
    await waitFor(() => expect(screen.queryByText(invalid)).not.toBeInTheDocument());
  });

  // Both halves or neither: a nameless button, or one that goes nowhere.
  it('wants the button label and link together', async () => {
    renderForm();
    typeInto('CTA link', '/earn');
    typeInto('CTA button label', 'Shop now');
    typeInto('CTA button label', '');
    expect(await screen.findByText('Give the button a label')).toBeInTheDocument();

    typeInto('CTA button label', 'Shop now');
    await waitFor(() => expect(screen.queryByText('Give the button a label')).not.toBeInTheDocument());
    typeInto('CTA link', '');
    expect(await screen.findByText('Give the button a link')).toBeInTheDocument();
  });

  it('offers the saved lists, with their size, once the audience is a saved list', async () => {
    const onSubmit = renderForm({
      ...blankAppPopupValues(),
      name: 'Diwali pod sale',
      image_url: 'https://cdn.duncit.com/app-popups/diwali.jpg',
    });
    expect(screen.queryByRole('combobox', { name: /Audience list/ })).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Target audience/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Saved audience list'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create popup' })).toBeDisabled());

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Audience list/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Pune regulars · 1284 people'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create popup' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Create popup' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      audience_type: 'AUDIENCE_LIST',
      audience_list_id: 'a1',
    });
  });
});

describe('app popup values', () => {
  it('reopens a row as form values, with no list for an everyone popup', () => {
    const everyone = toAppPopupValues(makeAppPopupRow());
    expect(everyone.audience_list_id).toBe('');
    expect(everyone.start_at).toBeInstanceOf(Date);

    const listed = toAppPopupValues(
      makeAppPopupRow({ audience_type: 'AUDIENCE_LIST', audience_list_id: 'a1' }),
    );
    expect(listed.audience_list_id).toBe('a1');
  });

  it('sends the list only for a saved-list popup, with ISO dates', () => {
    const base = {
      ...blankAppPopupValues(),
      name: 'Diwali pod sale',
      image_url: 'https://cdn.duncit.com/app-popups/diwali.jpg',
    };
    const listed = toAppPopupInput({ ...base, audience_type: 'AUDIENCE_LIST', audience_list_id: 'a1' });
    expect(listed.audience_list_id).toBe('a1');
    expect(listed.start_at).toBe(base.start_at.toISOString());

    const everyone = toAppPopupInput({ ...base, audience_list_id: 'a1' });
    expect(everyone.audience_list_id).toBeNull();
  });
});
