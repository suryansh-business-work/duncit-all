import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MockLink } from '@apollo/client/testing';
import { PUBLIC_APP_SETTINGS, PUBLIC_LOCALES, PUBLIC_TRANSLATIONS } from '@duncit/app-settings';
import { STORAGE_KEYS } from '../../shared/env';
import { LITE_ME, LITE_SET_MY_LOCALE } from '../../shared/graphql/documents';
import { App } from '../App';
import { LITE_ADMIN_STATS } from '../graphql/admin';
import { makeMe, makeStats } from './fixtures';
import { gqlStats, gqlUser } from './gql-results';

/** The client App builds, swapped for one answering from these mocks. */
const network = vi.hoisted(() => ({ mocks: [] as MockLink.MockedResponse[] }));

vi.mock('../../shared/apollo', async () => {
  const { ApolloClient, InMemoryCache } = await import('@apollo/client');
  const testing = await import('@apollo/client/testing');
  return {
    createLiteClient: () => new ApolloClient({ cache: new InMemoryCache(), link: new testing.MockLink(network.mocks, { defaultOptions: { delay: 0 } }) }),
  };
});

const locale = (code: string, label: string, english: string, isDefault: boolean) => ({ __typename: 'PublicLocale', code, label, english_label: english, is_rtl: false, is_default: isDefault, sort_order: 0 });

const platform = (locales: ReturnType<typeof locale>[]): MockLink.MockedResponse[] => [
  { request: { query: PUBLIC_LOCALES }, result: { data: { publicLocales: locales } } },
  { request: { query: PUBLIC_TRANSLATIONS, variables: () => true }, result: { data: { publicTranslations: [] } }, maxUsageCount: Number.POSITIVE_INFINITY },
  {
    request: { query: PUBLIC_APP_SETTINGS },
    result: {
      data: {
        publicAppSettings: {
          __typename: 'PublicAppSettings',
          date_format: 'dd MMM yyyy',
          time_format: 'hh:mm a',
          time_zone: 'Asia/Kolkata',
          time_source: 'SERVER',
          custom_time: null,
          custom_time_set_at: null,
          server_time: '2026-03-15T10:00:00.000Z',
          min_signup_age: 13,
          draft_retention_days: 30,
          ticket_discount_max_pct: 50,
          happening_nearby_days: 7,
        },
      },
    },
  },
];

beforeEach(() => {
  localStorage.clear();
  globalThis.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('sends a visitor with no stored session to the console sign-in', async () => {
    network.mocks = platform([]);
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Lite Console' })).toBeInTheDocument();
    expect(globalThis.location.pathname).toBe('/login');
    expect(screen.getByTestId('sign-in-email')).toBeInTheDocument();
  });

  /** A stored admin session whose saved language is Hindi, with `saveLocale` answering the profile write. */
  const signedInAdmin = (saveLocale: MockLink.MockedResponse['result']): MockLink.MockedResponse[] => {
    localStorage.setItem(STORAGE_KEYS.portalToken, 'tok-admin');
    return [
      ...platform([locale('en-IN', 'English', 'English', true), locale('hi', 'हिन्दी', 'Hindi', false)]),
      { request: { query: LITE_ME }, result: { data: { liteMe: gqlUser(makeMe({ is_admin: true, locale: 'hi' })) } } },
      { request: { query: LITE_ADMIN_STATS }, result: { data: { liteAdminStats: gqlStats(makeStats()) } } },
      { request: { query: LITE_SET_MY_LOCALE, variables: { locale: 'en-IN' } }, result: saveLocale },
    ];
  };

  const switchToEnglish = async () => {
    const user = userEvent.setup();
    expect(await screen.findByTestId('stat-users')).toBeInTheDocument();
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Dashboard');
    const picker = within(await screen.findByTestId('app-bar-language')).getByRole('combobox', { name: 'Language' });
    await waitFor(() => expect(picker).toHaveTextContent('हिन्दी'));
    await user.click(picker);
    await user.click(await screen.findByRole('option', { name: 'English' }));
    return picker;
  };

  it("opens the console for a stored admin session in the admin's saved language, and saves a switch back to the profile", async () => {
    const saveLocale = vi.fn(() => ({ data: { liteSetMyLocale: { __typename: 'LiteUser', id: 'user-1', locale: 'en-IN' } } }));
    network.mocks = signedInAdmin(saveLocale);
    render(<App />);
    await switchToEnglish();
    await waitFor(() => expect(saveLocale).toHaveBeenCalledTimes(1));
  });

  it('keeps the new language on screen when saving it to the profile fails', async () => {
    const saveLocale = vi.fn(() => ({ errors: [{ message: 'Profile is read-only' }] }));
    network.mocks = signedInAdmin(saveLocale);
    render(<App />);
    const picker = await switchToEnglish();
    await waitFor(() => expect(saveLocale).toHaveBeenCalledTimes(1));
    expect(picker).toHaveTextContent('English');
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Dashboard');
  });
});
