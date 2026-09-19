import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import TranslationsPage from '../TranslationsPage';
import { LOCALES, TRANSLATION_GROUPS, TRANSLATIONS_TABLE, UPSERT_TRANSLATION } from '../queries';

/** Keeps the grid a stub but round-trips its fetch through the real Apollo client. */
vi.mock('@duncit/table', () => import('./translation-table-mock'));

const locale = (code: string, label: string, over: Record<string, unknown> = {}) => ({
  __typename: 'Locale',
  id: `loc-${code}`,
  code,
  label,
  english_label: label,
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
  updated_at: '2026-08-01T00:00:00.000Z',
  ...over,
});

const LOCALE_ROWS = [
  locale('en-IN', 'English', { is_default: true }),
  locale('hi-IN', 'हिन्दी'),
  locale('ta-IN', 'தமிழ்', { is_active: false }),
];

const localesMock = (rows: unknown[] = LOCALE_ROWS): MockedResponse => ({
  request: { query: LOCALES },
  result: { data: { locales: rows } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const groupsMock: MockedResponse = {
  request: { query: TRANSLATION_GROUPS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      translationGroups: {
        __typename: 'TranslationGroupsPage',
        total: 1,
        page: 1,
        page_size: 25,
        rows: [
          {
            __typename: 'TranslationGroup',
            id: 'mweb.shop',
            surface: 'mweb',
            page: 'shop',
            key_count: 12,
            locales: [
              { __typename: 'TranslationGroupLocale', locale: 'en-IN', translated: 12 },
              { __typename: 'TranslationGroupLocale', locale: 'hi-IN', translated: 4 },
            ],
          },
        ],
      },
    },
  },
};

const entriesMock: MockedResponse = {
  request: { query: TRANSLATIONS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      translationsTable: {
        __typename: 'TranslationsTablePage',
        total: 1,
        page: 1,
        page_size: 25,
        rows: [
          {
            __typename: 'TranslationRow',
            id: 'tr-1',
            key: 'mweb.shop.emptyState',
            surface: 'mweb',
            page: 'shop',
            description: 'Shown when the shop has no products',
            values: [
              { __typename: 'TranslationValueEntry', key: 'en-IN', value: 'Nothing here yet' },
              { __typename: 'TranslationValueEntry', key: 'hi-IN', value: '' },
            ],
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      },
    },
  },
};

const upsertMock = (sent: Record<string, unknown>[]): MockedResponse => ({
  request: { query: UPSERT_TRANSLATION, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data: { upsertTranslation: { __typename: 'Translation', id: 'tr-1', key: 'mweb.shop.emptyState' } } };
  },
});

const openShopNamespace = async () => {
  fireEvent.click(await screen.findByText('mweb.shop'));
  expect(await screen.findByRole('heading', { name: 'mweb.shop' })).toBeInTheDocument();
};

describe('TranslationsPage — drilling into a namespace', () => {
  it('opens one namespace’s entries and edits an entry across every active language', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<TranslationsPage />, { mocks: [localesMock(), groupsMock, entriesMock, upsertMock(sent)] });

    await openShopNamespace();
    expect(screen.getByText('Translations / mweb')).toBeInTheDocument();
    expect(screen.getByText('12 keys')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('mweb.shop.emptyState'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit translation')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Key' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'English (en-IN) — default' })).toHaveValue('Nothing here yet');
    expect(within(dialog).queryByRole('textbox', { name: /ta-IN/ })).toBeNull();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'हिन्दी (hi-IN)' }), {
      target: { value: 'अभी यहाँ कुछ नहीं है' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Translation updated')).toBeInTheDocument();
    expect(sent[0]).toEqual({
      input: {
        key: 'mweb.shop.emptyState',
        description: 'Shown when the shop has no products',
        values: [
          { locale: 'en-IN', value: 'Nothing here yet' },
          { locale: 'hi-IN', value: 'अभी यहाँ कुछ नहीं है' },
        ],
      },
    });
  });

  it('goes back to the namespace list from the header', async () => {
    renderWithProviders(<TranslationsPage />, { mocks: [localesMock(), groupsMock, entriesMock] });

    await openShopNamespace();
    fireEvent.click(screen.getByRole('button', { name: 'Back to namespaces' }));

    expect(await screen.findByRole('heading', { name: 'Translations' })).toBeInTheDocument();
    expect(screen.queryByText('Translations / mweb')).toBeNull();
  });

  it('keeps the dialog open and shows the error when the save is rejected', async () => {
    renderWithProviders(<TranslationsPage />, {
      mocks: [
        localesMock(),
        groupsMock,
        entriesMock,
        { request: { query: UPSERT_TRANSLATION, variables: () => true }, error: new Error('Key is locked') },
      ],
    });

    await openShopNamespace();
    fireEvent.click(await screen.findByText('mweb.shop.emptyState'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Key is locked')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Translation updated')).toBeNull();
  });
});

describe('TranslationsPage — adding a key', () => {
  it('asks for a namespaced key before it will save a new translation', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<TranslationsPage />, { mocks: [localesMock(), groupsMock, upsertMock(sent)] });

    const add = await screen.findByRole('button', { name: 'Add translation' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add translation')).toBeInTheDocument();

    const key = within(dialog).getByRole('textbox', { name: 'Key' });
    fireEvent.change(key, { target: { value: 'shop' } });
    expect(within(dialog).getByText('Use at least portal.page.name, e.g. mweb.shop.emptyState')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.change(key, { target: { value: ' mweb.shop.soldOut ' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'English (en-IN) — default' }), {
      target: { value: 'Sold out' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Translation added')).toBeInTheDocument();
    expect(sent[0]).toEqual({
      input: {
        key: 'mweb.shop.soldOut',
        description: '',
        values: [
          { locale: 'en-IN', value: 'Sold out' },
          { locale: 'hi-IN', value: '' },
        ],
      },
    });
  });
});

describe('TranslationsPage — no active languages', () => {
  it('warns, disables adding, and an opened entry has nothing to translate into', async () => {
    renderWithProviders(<TranslationsPage />, {
      mocks: [localesMock([locale('ta-IN', 'தமிழ்', { is_active: false })]), groupsMock, entriesMock],
    });

    expect(
      await screen.findByText('No active locales yet — add one under Localization → Locales first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add translation' })).toBeDisabled();

    await openShopNamespace();
    fireEvent.click(await screen.findByText('mweb.shop.emptyState'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add a locale first — there is nothing to translate into.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
