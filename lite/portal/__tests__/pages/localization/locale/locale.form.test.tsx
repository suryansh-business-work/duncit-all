import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteLocale } from '../../../../graphql/localization';
import { LocaleForm, type LocaleFormValues } from '../../../../pages/localization/locale';
import { makeLocale } from '../../../fixtures';

type Submit = (values: LocaleFormValues) => Promise<void>;

const form = ({ initial = null, busy = false, onSubmit = vi.fn<Submit>(() => Promise.resolve()) }: { initial?: LiteLocale | null; busy?: boolean; onSubmit?: Submit } = {}) => (
  <LocaleForm open initial={initial} busy={busy} onClose={vi.fn()} onSubmit={onSubmit} />
);

describe('LocaleForm', () => {
  it('adds a language with an editable code', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    expect(screen.getByRole('dialog', { name: 'New language' })).toBeInTheDocument();
    await user.type(screen.getByTestId('locale-code'), 'ta');
    await user.type(screen.getByTestId('locale-label'), 'தமிழ்');
    await user.type(screen.getByTestId('locale-english-label'), 'Tamil');
    await user.click(screen.getByLabelText('Right-to-left script'));
    await user.click(screen.getByTestId('locale-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ code: 'ta', label: 'தமிழ்', english_label: 'Tamil', is_rtl: true, is_default: false, sort_order: '0', is_active: true });
  });

  it('edits a language under its English name with the code locked', () => {
    render(form({ initial: makeLocale({ code: 'hi', label: 'हिन्दी', english_label: 'Hindi', is_default: false }) }));
    expect(screen.getByRole('dialog', { name: 'Edit Hindi' })).toBeInTheDocument();
    expect(screen.getByTestId('locale-code')).toHaveValue('hi');
    expect(screen.getByTestId('locale-code')).toBeDisabled();
    expect(screen.getByTestId('locale-label')).toBeEnabled();
    expect(screen.getByText('Every other language falls back to it')).toBeInTheDocument();
  });

  it('refuses a malformed code without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.type(screen.getByTestId('locale-code'), 'English');
    await user.type(screen.getByTestId('locale-label'), 'English');
    await user.type(screen.getByTestId('locale-english-label'), 'English');
    await user.click(screen.getByTestId('locale-dialog-submit'));
    expect(await screen.findByText('Use a language tag such as en-IN or hi')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks every field while saving', () => {
    render(form({ busy: true }));
    for (const id of ['locale-code', 'locale-label', 'locale-english-label', 'locale-sort-order', 'locale-rtl', 'locale-default', 'locale-active']) {
      expect(screen.getByTestId(id), id).toBeDisabled();
    }
  });
});
