import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { ALL_LITE_ENTRIES } from '../../../../shared/i18n';
import { LITE_DELETE_LOCALE, LITE_IMPORT_TRANSLATION_KEYS, LITE_LOCALES, LITE_TRANSLATIONS_TABLE, LITE_UPSERT_LOCALE } from '../../../graphql/localization';
import { LocalizationPage } from '../../../pages/localization';
import { makeLocale } from '../../fixtures';
import { gqlLocale, tablePage } from '../../gql-results';
import { findConfirm, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

const hindi = makeLocale({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_default: false, sort_order: 1, translated_count: 12 });
const english = makeLocale();

const localesQuery = (locales = [hindi, english]): GqlMock => ({ request: { query: LITE_LOCALES }, result: { data: { liteLocales: locales.map(gqlLocale) } } });
const translations: GqlMock = {
  request: { query: LITE_TRANSLATIONS_TABLE, variables: () => true },
  result: { data: { liteTranslationsTable: tablePage('LiteTranslationsPage', []) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

describe('LocalizationPage', () => {
  it('opens on the default language even when it is not listed first', async () => {
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations] });
    expect(screen.getByRole('heading', { level: 1, name: 'Localization' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Translations for English' })).toBeInTheDocument();
    expect(screen.getByTestId('locale-select-en-IN')).toHaveClass('Mui-selected');
  });

  it('switches the translations to the language the admin picks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations] });
    await user.click(await screen.findByTestId('locale-select-hi'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Translations for Hindi' })).toBeInTheDocument();
  });

  it('falls back to the first language when none is marked default', async () => {
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery([hindi]), translations] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Translations for Hindi' })).toBeInTheDocument();
  });

  it('asks the admin to add a language when there are none', async () => {
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery([])] });
    expect(await screen.findByText('Pick a language to see its translations.')).toBeInTheDocument();
  });

  it("imports every shipped key and reports the server's counts", async () => {
    const user = userEvent.setup();
    const importKeys: GqlMock = {
      request: { query: LITE_IMPORT_TRANSLATION_KEYS, variables: { entries: ALL_LITE_ENTRIES() } },
      result: { data: { liteImportTranslationKeys: { __typename: 'LiteImportResult', created: 5, skipped: 2 } } },
    };
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations, importKeys, localesQuery()] });
    await user.click(await screen.findByTestId('locale-import-keys'));
    expect(await findToast('success')).toHaveTextContent('5 keys added, 2 already there');
  });

  it('reports a failed import', async () => {
    const user = userEvent.setup();
    const importKeys: GqlMock = { request: { query: LITE_IMPORT_TRANSLATION_KEYS, variables: () => true }, result: { errors: [new GraphQLError('Import is locked')] } };
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations, importKeys] });
    await user.click(await screen.findByTestId('locale-import-keys'));
    expect(await findToast('error')).toHaveTextContent('Import is locked');
  });

  it('adds a language through the dialog', async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: { query: LITE_UPSERT_LOCALE, variables: { input: { code: 'ta', label: 'Tamil', english_label: 'Tamil', is_rtl: false, is_default: false, sort_order: 0, is_active: true } } },
      result: { data: { liteUpsertLocale: gqlLocale(makeLocale({ code: 'ta', label: 'Tamil', english_label: 'Tamil', is_default: false })) } },
    };
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations, upsert, localesQuery()] });
    await user.click(await screen.findByTestId('locale-add'));
    await user.type(await screen.findByTestId('locale-code'), 'ta');
    await user.type(screen.getByTestId('locale-label'), 'Tamil');
    await user.type(screen.getByTestId('locale-english-label'), 'Tamil');
    await user.click(screen.getByTestId('locale-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Tamil saved');
  });

  it('edits a language in the dialog titled with its English name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations] });
    await user.click(await screen.findByRole('button', { name: 'Edit Hindi' }));
    expect(await screen.findByRole('dialog', { name: 'Edit Hindi' })).toBeInTheDocument();
    expect(screen.getByTestId('locale-code')).toBeDisabled();
  });

  it('deletes a language after warning that its translations go too', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteLocale: true } }));
    renderWithProviders(<LocalizationPage />, {
      mocks: [localesQuery(), translations, { request: { query: LITE_DELETE_LOCALE, variables: { code: 'hi' } }, result: remove }, localesQuery([english])],
    });
    await user.click(await screen.findByRole('button', { name: 'Delete Hindi' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Delete Hindi?')).toBeInTheDocument();
    expect(confirm.getByText('Its translations are removed too.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Delete' }));
    expect(await findToast('success')).toHaveTextContent('Hindi deleted');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('keeps the language when the delete is cancelled', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteLocale: true } }));
    renderWithProviders(<LocalizationPage />, { mocks: [localesQuery(), translations, { request: { query: LITE_DELETE_LOCALE, variables: { code: 'hi' } }, result: remove }] });
    await user.click(await screen.findByRole('button', { name: 'Delete Hindi' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
  });
});
