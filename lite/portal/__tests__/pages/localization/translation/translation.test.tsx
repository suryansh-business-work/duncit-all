import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteTranslationRow } from '../../../../graphql/localization';
import { emptyTranslationValues, makeTranslationSchema, TranslationForm, type TranslationFormValues } from '../../../../pages/localization/translation';
import { makeTranslation } from '../../../fixtures';
import { portalT } from '../../../test-utils';

type Submit = (values: TranslationFormValues) => Promise<void>;
const schema = makeTranslationSchema(portalT);
const firstMessage = (values: TranslationFormValues) => schema.safeParse(values).error?.issues[0]?.message;

describe('makeTranslationSchema', () => {
  it('starts blank and accepts a key with its text', () => {
    expect(emptyTranslationValues()).toEqual({ key: '', value: '' });
    expect(schema.parse({ key: ' liteWeb.nav.discover ', value: ' खोजें ' })).toEqual({ key: 'liteWeb.nav.discover', value: 'खोजें' });
  });

  it('requires a key of at most 200 characters', () => {
    expect(firstMessage({ key: '', value: 'x' })).toBe('Key is required');
    expect(firstMessage({ key: 'k'.repeat(200), value: 'x' })).toBeUndefined();
    expect(firstMessage({ key: 'k'.repeat(201), value: 'x' })).toBe('Key must be 200 characters or fewer');
  });

  it('requires text of at most 2000 characters, refusing whitespace alone', () => {
    expect(firstMessage({ key: 'a.b', value: '   ' })).toBe('Value is required');
    expect(firstMessage({ key: 'a.b', value: 'v'.repeat(2000) })).toBeUndefined();
    expect(firstMessage({ key: 'a.b', value: 'v'.repeat(2001) })).toBe('Value must be 2000 characters or fewer');
  });
});

const form = ({ initial = null, onSubmit = vi.fn<Submit>(() => Promise.resolve()), busy = false }: { initial?: LiteTranslationRow | null; onSubmit?: Submit; busy?: boolean } = {}) => (
  <TranslationForm open initial={initial} busy={busy} onClose={vi.fn()} onSubmit={onSubmit} />
);

describe('TranslationForm', () => {
  it('adds a translation with both boxes editable', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    expect(screen.getByRole('dialog', { name: 'New translation' })).toBeInTheDocument();
    await user.type(screen.getByTestId('translation-key'), 'liteWeb.nav.home');
    await user.type(screen.getByTestId('translation-value'), 'होम');
    await user.click(screen.getByTestId('translation-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ key: 'liteWeb.nav.home', value: 'होम' });
  });

  it('edits only the text of an existing key', () => {
    render(form({ initial: makeTranslation() }));
    expect(screen.getByRole('dialog', { name: 'Edit translation' })).toBeInTheDocument();
    expect(screen.getByTestId('translation-key')).toHaveValue('liteWeb.nav.discover');
    expect(screen.getByTestId('translation-key')).toBeDisabled();
    expect(screen.getByTestId('translation-value')).toHaveValue('खोजें');
    expect(screen.getByText('Keep the {placeholders} exactly as they are')).toBeInTheDocument();
  });

  it('shows both required messages on an empty submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.click(screen.getByTestId('translation-dialog-submit'));
    expect(await screen.findByText('Key is required')).toBeInTheDocument();
    expect(screen.getByText('Value is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the boxes while saving', () => {
    render(form({ busy: true }));
    expect(screen.getByTestId('translation-key')).toBeDisabled();
    expect(screen.getByTestId('translation-value')).toBeDisabled();
  });
});
