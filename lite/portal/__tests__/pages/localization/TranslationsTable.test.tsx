import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_DELETE_TRANSLATION, LITE_SET_TRANSLATIONS, LITE_TRANSLATIONS_TABLE } from '../../../graphql/localization';
import { TranslationsTable } from '../../../pages/localization/TranslationsTable';
import { makeLocale, makeTranslation } from '../../fixtures';
import { gqlTranslation, tablePage } from '../../gql-results';
import { findConfirm, findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

const hindi = makeLocale({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_default: false });
const row = makeTranslation();

interface TableVars {
  locale?: string;
  query?: { sort_by?: string | null; sort_dir?: string };
}

/** Only a request for Hindi's rows, sorted by key, is answered — the table must pass the locale it shows. */
const hindiRows = (rows = [row]): GqlMock => ({
  request: { query: LITE_TRANSLATIONS_TABLE, variables: (vars: TableVars) => vars.locale === 'hi' && vars.query?.sort_by === 'key' && vars.query.sort_dir === 'asc' },
  result: { data: { liteTranslationsTable: tablePage('LiteTranslationsPage', rows.map(gqlTranslation)) } },
});

describe('TranslationsTable', () => {
  it("asks for this language's translations sorted by key and lists them", async () => {
    renderWithProviders(<TranslationsTable locale={hindi} />, { mocks: [hindiRows()] });
    const cells = await findRow('tr-1');
    expect(cells.getByText('liteWeb.nav.discover')).toBeInTheDocument();
    expect(cells.getByText('खोजें')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Translations for Hindi' })).toBeInTheDocument();
  });

  it('adds a translation for this language and reloads the page of rows', async () => {
    const user = userEvent.setup();
    const save: GqlMock = {
      request: { query: LITE_SET_TRANSLATIONS, variables: { locale: 'hi', entries: [{ key: 'liteWeb.nav.home', value: 'होम' }] } },
      result: { data: { liteSetTranslations: 1 } },
    };
    const added = makeTranslation({ id: 'tr-2', key: 'liteWeb.nav.home', value: 'होम' });
    renderWithProviders(<TranslationsTable locale={hindi} />, { mocks: [hindiRows(), save, hindiRows([row, added])] });
    await user.click(await screen.findByTestId('translation-add'));
    await user.type(await screen.findByTestId('translation-key'), 'liteWeb.nav.home');
    await user.type(screen.getByTestId('translation-value'), 'होम');
    await user.click(screen.getByTestId('translation-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Translation saved');
    expect((await findRow('tr-2')).getByText('होम')).toBeInTheDocument();
  });

  it('edits the text of a row and keeps the dialog open when the save fails', async () => {
    const user = userEvent.setup();
    const save: GqlMock = {
      request: { query: LITE_SET_TRANSLATIONS, variables: { locale: 'hi', entries: [{ key: 'liteWeb.nav.discover', value: 'खोज' }] } },
      result: { errors: [new GraphQLError('Placeholders do not match')] },
    };
    renderWithProviders(<TranslationsTable locale={hindi} />, { mocks: [hindiRows(), save] });
    await user.click((await findRow('tr-1')).getByRole('button', { name: 'Edit liteWeb.nav.discover' }));
    const value = await screen.findByTestId('translation-value');
    await user.clear(value);
    await user.type(value, 'खोज');
    await user.click(screen.getByTestId('translation-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('Placeholders do not match');
    expect(screen.getByRole('dialog', { name: 'Edit translation' })).toBeInTheDocument();
  });

  it('deletes a row after confirming that the app falls back to the built-in copy', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteTranslation: true } }));
    renderWithProviders(<TranslationsTable locale={hindi} />, {
      mocks: [hindiRows(), { request: { query: LITE_DELETE_TRANSLATION, variables: { id: 'tr-1' } }, result: remove }, hindiRows([])],
    });
    await user.click((await findRow('tr-1')).getByRole('button', { name: 'Delete liteWeb.nav.discover' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Delete liteWeb.nav.discover?')).toBeInTheDocument();
    expect(confirm.getByText('The app falls back to the built-in copy.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Delete' }));
    expect(await findToast('success')).toHaveTextContent('Translation deleted');
    expect(remove).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No translations yet. Import the app keys to start.');
  });

  it('does not delete when the admin cancels', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteTranslation: true } }));
    renderWithProviders(<TranslationsTable locale={hindi} />, { mocks: [hindiRows(), { request: { query: LITE_DELETE_TRANSLATION, variables: { id: 'tr-1' } }, result: remove }] });
    await user.click((await findRow('tr-1')).getByRole('button', { name: 'Delete liteWeb.nav.discover' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
  });
});
