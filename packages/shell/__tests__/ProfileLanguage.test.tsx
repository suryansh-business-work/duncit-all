import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s,
}));
vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
}));

const ENGLISH = { code: 'en-IN', label: 'English', english_label: 'English' };
const HINDI = { code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi' };

const i18n = vi.hoisted(() => ({
  locale: 'en-IN',
  locales: [] as Array<{ code: string; label: string; english_label: string }>,
  setLocale: vi.fn(),
}));

vi.mock('../src/i18n/useTranslation', async () => {
  // Real bundled copy, so the assertions below check the text a portal user sees.
  const { SHELL_FALLBACK_FLAT } = await import('../src/i18n/fallback');
  return {
    useTranslation: () => ({
      t: (key: string) => SHELL_FALLBACK_FLAT[key] ?? key,
      locale: i18n.locale,
      locales: i18n.locales,
      setLocale: i18n.setLocale,
    }),
  };
});

import { useMutation } from '@apollo/client/react';
import { ProfileLanguage } from '../src/chrome/ProfileLanguage';

const mockMutation = vi.mocked(useMutation);

beforeEach(() => {
  i18n.locale = 'en-IN';
  i18n.locales = [ENGLISH, HINDI];
  i18n.setLocale = vi.fn();
});

const pickHindi = async () => {
  const u = userEvent.setup();
  await u.click(screen.getByRole('combobox', { name: 'Language' }));
  // `findByRole` — the menu opens a render after the click that opened it, so a
  // synchronous read is a race that only shows up under load (see the same fix in
  // @duncit/pod-form's category cascade).
  await u.click(await screen.findByRole('option', { name: 'हिन्दी · Hindi' }));
};

describe('ProfileLanguage', () => {
  it('renders nothing until the platform has two active locales', () => {
    i18n.locales = [ENGLISH];
    mockMutation.mockReturnValue([vi.fn(), { loading: false }] as never);

    const { container } = render(<ProfileLanguage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the switcher with the portal hint once two locales exist', () => {
    mockMutation.mockReturnValue([vi.fn(), { loading: false }] as never);

    render(<ProfileLanguage />);
    expect(screen.getByText('LANGUAGE')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('English');
    expect(screen.getByText('Choose the language for this portal.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('switches the language, saves it and confirms', async () => {
    const save = vi.fn().mockResolvedValue({});
    mockMutation.mockReturnValue([save, { loading: false }] as never);

    render(<ProfileLanguage />);
    await pickHindi();

    expect(i18n.setLocale).toHaveBeenCalledWith('hi-IN');
    expect(save).toHaveBeenCalledWith({ variables: { locale: 'hi-IN' } });
    expect(await screen.findByText('Language updated')).toBeInTheDocument();
  });

  it('still switches the language but surfaces the error when the save fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Network request failed'));
    mockMutation.mockReturnValue([save, { loading: false }] as never);

    render(<ProfileLanguage />);
    await pickHindi();

    expect(i18n.setLocale).toHaveBeenCalledWith('hi-IN');
    expect(await screen.findByText('Network request failed')).toBeInTheDocument();
    expect(screen.queryByText('Language updated')).not.toBeInTheDocument();
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    const save = vi.fn().mockRejectedValue('boom');
    mockMutation.mockReturnValue([save, { loading: false }] as never);

    render(<ProfileLanguage />);
    await pickHindi();

    expect(await screen.findByText('Could not save your language')).toBeInTheDocument();
  });
});
