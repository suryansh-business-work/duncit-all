import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../__tests__/testkit';
import { DELETE_LOCALE, LOCALES, UPSERT_LOCALE, type LocaleRow } from '../queries';
import LocalesPage from '../LocalesPage';
import type { LocaleFormValues } from '../LocaleDialog';

/** The real dialog is a react-hook-form + zod form of its own; this stub keeps
 * the page's own wiring (which row is being edited, saving flag, submit) under
 * test without re-testing the form. */
const SUBMITTED: LocaleFormValues = {
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: 'Hindi (India)',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 2,
};

vi.mock('../LocaleDialog', () => ({
  default: ({
    open,
    editing,
    saving,
    onClose,
    onSubmit,
  }: {
    open: boolean;
    editing: { code: string } | null;
    saving: boolean;
    onClose: () => void;
    onSubmit: (values: LocaleFormValues) => void;
  }) =>
    open ? (
      <div>
        <span data-testid="dialog-editing">{editing ? editing.code : 'new'}</span>
        <span data-testid="dialog-saving">{saving ? 'saving' : 'idle'}</span>
        <button type="button" onClick={() => onSubmit(SUBMITTED)}>
          dialog-submit
        </button>
        <button type="button" onClick={onClose}>
          dialog-close
        </button>
      </div>
    ) : null,
}));

const makeLocale = (over: Partial<LocaleRow> = {}): LocaleRow & { __typename: 'Locale' } => ({
  __typename: 'Locale',
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

const HINDI = makeLocale({
  id: 'l2',
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: '',
  is_rtl: false,
  is_active: false,
  is_default: false,
  sort_order: 1,
});

const ARABIC = makeLocale({
  id: 'l3',
  code: 'ar-AE',
  label: 'العربية',
  english_label: 'Arabic (UAE)',
  is_rtl: true,
  is_active: true,
  is_default: false,
  sort_order: 2,
});

const localesMock = (locales: unknown[]): MockedResponse => ({
  request: { query: LOCALES },
  result: { data: { locales } },
  maxUsageCount: 5,
});

const localesErrorMock = (): MockedResponse => ({
  request: { query: LOCALES },
  error: new Error('Locales are unavailable'),
});

describe('LocalesPage', () => {
  it('renders every locale row with its code, names and flag chips', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [localesMock([makeLocale(), HINDI, ARABIC])],
    });

    const defaultRow = (await screen.findByText('en-IN')).closest('tr') as HTMLElement;
    expect(within(defaultRow).getByText('English (India)')).toBeInTheDocument();
    expect(within(defaultRow).getByText('Default')).toBeInTheDocument();
    expect(within(defaultRow).getByText('Active')).toBeInTheDocument();

    const hindiRow = screen.getByText('हिन्दी').closest('tr') as HTMLElement;
    // english_label is blank on this row -> em dash placeholder.
    expect(within(hindiRow).getByText('—')).toBeInTheDocument();
    expect(within(hindiRow).getByText('Off')).toBeInTheDocument();
    expect(within(hindiRow).queryByText('Default')).not.toBeInTheDocument();
    expect(within(hindiRow).queryByText('RTL')).not.toBeInTheDocument();

    const arabicRow = screen.getByText('ar-AE').closest('tr') as HTMLElement;
    expect(within(arabicRow).getByText('RTL')).toBeInTheDocument();
  });

  it('shows the empty state instead of the table when there are no locales', async () => {
    renderWithProviders(<LocalesPage />, { mocks: [localesMock([])] });
    expect(
      await screen.findByText('No locales yet — add one to start translating.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('English name')).not.toBeInTheDocument();
  });

  it('surfaces a query error', async () => {
    renderWithProviders(<LocalesPage />, { mocks: [localesErrorMock()] });
    expect(await screen.findByText('Locales are unavailable')).toBeInTheDocument();
  });

  it('opens a blank dialog from "Add locale" and closes it again', async () => {
    renderWithProviders(<LocalesPage />, { mocks: [localesMock([makeLocale()])] });
    await screen.findByText('en-IN');
    expect(screen.queryByTestId('dialog-editing')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add locale' }));
    expect(screen.getByTestId('dialog-editing')).toHaveTextContent('new');

    fireEvent.click(screen.getByText('dialog-close'));
    expect(screen.queryByTestId('dialog-editing')).not.toBeInTheDocument();
  });

  it('opens the dialog pre-loaded with the row being edited', async () => {
    renderWithProviders(<LocalesPage />, { mocks: [localesMock([makeLocale(), HINDI])] });
    const hindiRow = (await screen.findByText('hi-IN')).closest('tr') as HTMLElement;
    fireEvent.click(within(hindiRow).getAllByRole('button')[0]);
    expect(screen.getByTestId('dialog-editing')).toHaveTextContent('hi-IN');
  });

  it('sends the form values to upsertLocale and confirms an add', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [
        localesMock([makeLocale()]),
        {
          request: { query: UPSERT_LOCALE, variables: { input: SUBMITTED } },
          result: { data: { upsertLocale: makeLocale({ id: 'l2', code: 'hi-IN' }) } },
        },
      ],
    });
    await screen.findByText('en-IN');
    fireEvent.click(screen.getByRole('button', { name: 'Add locale' }));
    fireEvent.click(screen.getByText('dialog-submit'));

    expect(await screen.findByText('Locale added')).toBeInTheDocument();
    // A successful save closes the dialog.
    expect(screen.queryByTestId('dialog-editing')).not.toBeInTheDocument();
    // …and the toast clears itself after its auto-hide window.
    await waitFor(() => expect(screen.queryByText('Locale added')).not.toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it('confirms an update when the dialog was opened on an existing row', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [
        localesMock([makeLocale(), HINDI]),
        {
          request: { query: UPSERT_LOCALE, variables: { input: SUBMITTED } },
          result: { data: { upsertLocale: HINDI } },
        },
      ],
    });
    const hindiRow = (await screen.findByText('hi-IN')).closest('tr') as HTMLElement;
    fireEvent.click(within(hindiRow).getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('dialog-submit'));

    expect(await screen.findByText('Locale updated')).toBeInTheDocument();
  });

  it('keeps the dialog open and shows the error when the save fails', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [
        localesMock([makeLocale()]),
        {
          request: { query: UPSERT_LOCALE, variables: { input: SUBMITTED } },
          result: { errors: [new GraphQLError('Locale code already exists')] },
        },
      ],
    });
    await screen.findByText('en-IN');
    fireEvent.click(screen.getByRole('button', { name: 'Add locale' }));
    fireEvent.click(screen.getByText('dialog-submit'));

    expect(await screen.findByText('Locale code already exists')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-editing')).toBeInTheDocument();
    expect(screen.queryByText('Locale added')).not.toBeInTheDocument();
  });

  it('deletes a non-default locale by code', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [
        localesMock([makeLocale(), HINDI]),
        {
          request: { query: DELETE_LOCALE, variables: { code: 'hi-IN' } },
          result: { data: { deleteLocale: true } },
        },
      ],
    });
    const hindiRow = (await screen.findByText('hi-IN')).closest('tr') as HTMLElement;
    const [, deleteButton] = within(hindiRow).getAllByRole('button');
    expect(deleteButton).not.toBeDisabled();
    fireEvent.click(deleteButton);

    expect(await screen.findByText('hi-IN removed')).toBeInTheDocument();
  });

  it('cannot delete the default locale', async () => {
    renderWithProviders(<LocalesPage />, { mocks: [localesMock([makeLocale()])] });
    const defaultRow = (await screen.findByText('en-IN')).closest('tr') as HTMLElement;
    const [, deleteButton] = within(defaultRow).getAllByRole('button');
    expect(deleteButton).toBeDisabled();
  });

  it('surfaces a delete failure', async () => {
    renderWithProviders(<LocalesPage />, {
      mocks: [
        localesMock([makeLocale(), HINDI]),
        {
          request: { query: DELETE_LOCALE, variables: { code: 'hi-IN' } },
          result: { errors: [new GraphQLError('Locale is still in use')] },
        },
      ],
    });
    const hindiRow = (await screen.findByText('hi-IN')).closest('tr') as HTMLElement;
    fireEvent.click(within(hindiRow).getAllByRole('button')[1]);

    expect(await screen.findByText('Locale is still in use')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('hi-IN removed')).not.toBeInTheDocument());
  });
});
