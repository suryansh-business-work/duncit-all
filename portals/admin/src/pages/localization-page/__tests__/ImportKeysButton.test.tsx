import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { allFallbackEntries } from '@duncit/app-settings';
import { renderWithProviders } from '../../../__tests__/testkit';
import ImportKeysButton from '../ImportKeysButton';
import { IMPORT_TRANSLATION_KEYS, SERVER_TRANSLATION_SEED } from '../queries';

const seedMock = (rows: { key: string; value: string }[]): MockedResponse => ({
  request: { query: SERVER_TRANSLATION_SEED },
  result: {
    data: { serverTranslationSeed: rows.map((row) => ({ __typename: 'TranslationEntry', ...row })) },
  },
});

/** Answers the import with `added` and records what was sent. */
const importMock = (added: number, sent: Record<string, unknown>[], delay = 0): MockedResponse => ({
  request: { query: IMPORT_TRANSLATION_KEYS, variables: () => true },
  delay,
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data: { importTranslationKeys: added } };
  },
});

const importButton = () => screen.getByRole('button', { name: /Import app keys|Importing…/ });

describe('ImportKeysButton', () => {
  it('stays disabled until there is a default locale to store the text against', () => {
    renderWithProviders(<ImportKeysButton defaultLocale={null} onDone={vi.fn()} onError={vi.fn()} />);
    expect(importButton()).toBeDisabled();
  });

  it('sends every shipped key plus the server’s email keys to the default locale', async () => {
    const sent: Record<string, unknown>[] = [];
    const onDone = vi.fn();
    renderWithProviders(<ImportKeysButton defaultLocale="en-IN" onDone={onDone} onError={vi.fn()} />, {
      mocks: [
        seedMock([{ key: 'email.welcome.subject', value: 'Welcome to Duncit' }]),
        importMock(12, sent, 30),
      ],
    });

    fireEvent.click(importButton());
    expect(await screen.findByRole('button', { name: 'Importing…' })).toBeDisabled();

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('12 new key(s) imported'));
    const { locale, entries } = sent[0] as { locale: string; entries: { key: string; value: string }[] };
    expect(locale).toBe('en-IN');
    expect(entries).toContainEqual({ key: 'email.welcome.subject', value: 'Welcome to Duncit' });
    expect(entries).toHaveLength(new Set([...Object.keys(allFallbackEntries()), 'email.welcome.subject']).size);
    await waitFor(() => expect(importButton()).toHaveTextContent('Import app keys'));
  });

  it('says so when nothing was missing', async () => {
    const onDone = vi.fn();
    renderWithProviders(<ImportKeysButton defaultLocale="en-IN" onDone={onDone} onError={vi.fn()} />, {
      mocks: [seedMock([]), importMock(0, [])],
    });

    fireEvent.click(importButton());

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Already up to date'));
  });

  it('reports a failed request instead of a result', async () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    renderWithProviders(<ImportKeysButton defaultLocale="en-IN" onDone={onDone} onError={onError} />, {
      mocks: [{ request: { query: SERVER_TRANSLATION_SEED }, error: new Error('Seed unavailable') }],
    });

    fireEvent.click(importButton());

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Seed unavailable'));
    expect(onDone).not.toHaveBeenCalled();
    await waitFor(() => expect(importButton()).toBeEnabled());
  });
});
