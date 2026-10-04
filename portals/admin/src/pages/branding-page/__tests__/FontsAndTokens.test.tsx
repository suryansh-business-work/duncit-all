import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { light } from '@duncit/auth-tokens';
import { contrastRatio } from '@duncit/theme';
import FontsSection from '../FontsSection';
import ThemeTokensSection from '../theme-tokens/ThemeTokensSection';
import {
  TOKEN_ROWS,
  emptyThemeTokens,
  isTokenValueValid,
  primaryTokens,
  tokenContrast,
  toThemeTokensInput,
} from '../theme-tokens/tokenRows';
import type { BrandingFormState } from '../queries';
import { FormHarness } from './form-harness';

const lastForm = (onForm: ReturnType<typeof vi.fn>) => onForm.mock.lastCall?.[0] as BrandingFormState;

/** The Fonts tab strip keeps its selection in the URL, so it needs a router. */
const renderInRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const fontLinks = () =>
  [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);

afterEach(() => {
  document.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());
});

describe('FontsSection', () => {
  it('loads the picked family for the preview and writes a new pick to the platform on screen', () => {
    const onForm = vi.fn();
    renderInRouter(
      <FormHarness onForm={onForm} initial={{ mobile_font_family: 'Inter' }}>
        {(form, setForm) => <FontsSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    const input = screen.getByRole('combobox', { name: 'Mobile App font (Google Fonts)' });
    expect(input).toHaveValue('Inter');
    expect(fontLinks().some((href) => href.includes('family=Inter:'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('option', { name: 'Poppins' }));

    expect(lastForm(onForm).mobile_font_family).toBe('Poppins');
    expect(fontLinks().some((href) => href.includes('family=Poppins:'))).toBe(true);
    expect(fontLinks().some((href) => href.includes('family=Inter:'))).toBe(false);
  });

  it('clears a platform back to the built-in default font', () => {
    const onForm = vi.fn();
    renderInRouter(
      <FormHarness onForm={onForm} initial={{ mobile_font_family: 'Inter' }}>
        {(form, setForm) => <FontsSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    // The clear indicator is CSS-hidden until hover/focus, so it has no computed
    // accessible name in jsdom; its `title` still identifies it.
    fireEvent.click(screen.getByTitle('Clear'));

    expect(lastForm(onForm).mobile_font_family).toBe('');
    expect(fontLinks()).toEqual([]);
  });

  it('edits a different platform once its tab is picked', async () => {
    const onForm = vi.fn();
    renderInRouter(
      <FormHarness onForm={onForm} initial={{ mobile_font_family: 'Inter', mweb_font_family: '' }}>
        {(form, setForm) => <FontsSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'mWeb' }));
    const input = await screen.findByRole('combobox', { name: 'mWeb font (Google Fonts)' });
    expect(input).toHaveValue('');
    expect(screen.getByText(/The consumer PWA \(MUI theme\)\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('option', { name: 'Lato' }));
    expect(lastForm(onForm)).toMatchObject({ mobile_font_family: 'Inter', mweb_font_family: 'Lato' });
  });
});

describe('ThemeTokensSection', () => {
  it('flips between the bundled (LOCAL) and the server tokens, explaining each', async () => {
    const onForm = vi.fn();
    render(
      <FormHarness onForm={onForm}>
        {(form, setForm) => <ThemeTokensSection form={form} setForm={setForm} />}
      </FormHarness>,
    );

    const toggle = screen.getByRole('switch', { name: 'Take theme tokens from this page (Server)' });
    expect(screen.getByText(/^Off — mWeb and the app use their bundled \(local\) tokens\./)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(lastForm(onForm).theme_token_source).toBe('SERVER');
    await waitFor(() =>
      expect(screen.getByText('On — mWeb and the app lay the values below over their bundled tokens.')).toBeInTheDocument(),
    );

    fireEvent.click(toggle);
    expect(lastForm(onForm).theme_token_source).toBe('LOCAL');
  });
});

describe('tokenRows — colour validation', () => {
  it('accepts a blank value or any hex form the server accepts', () => {
    for (const value of ['', '  ', '#fff', '#ffff', '#D92D2D', '#D92D2D80']) {
      expect(isTokenValueValid(value)).toBe(true);
    }
  });

  it('accepts rgb() and rgba() with spaces around each channel', () => {
    expect(isTokenValueValid('rgb(217, 45, 45)')).toBe(true);
    expect(isTokenValueValid(' rgba(0,0,0,.5) ')).toBe(true);
    expect(isTokenValueValid('RGBA(255, 255, 255, 1)')).toBe(true);
  });

  it('rejects half-typed or malformed colours', () => {
    for (const value of [
      'red',
      '#12',
      'rgb(217, 45, 45',
      'rgb(217, 45)',
      'rgba(1, 2, 3, 4, 5)',
      'rgb(1000, 0, 0)',
      'rgba(0, 0, 0, 1.5)',
      'rgb(a, b, c)',
    ]) {
      expect(isTokenValueValid(value)).toBe(false);
    }
  });

  it('cannot measure the contrast of an rgba() colour', () => {
    const inkRow = TOKEN_ROWS.find((row) => row.key === 'ink');
    if (!inkRow) throw new Error('ink row missing');
    expect(tokenContrast({ ...emptyThemeTokens(), ink: 'rgba(0, 0, 0, 0.9)' }, light, inkRow)).toBeNull();
  });

  it('only moves the primary colour when what was typed is not a hex yet', () => {
    expect(primaryTokens('rgb(217, 45, 45)')).toEqual({ primary: 'rgb(217, 45, 45)' });
  });
});

describe('tokenRows — toThemeTokensInput', () => {
  it('turns a missing stored token object into every key blank', () => {
    expect(toThemeTokensInput(null)).toEqual(emptyThemeTokens());
    expect(toThemeTokensInput(undefined)).toEqual(emptyThemeTokens());
  });

  it('keeps stored values, blanks the missing keys and drops anything that is not a token', () => {
    const stored = { primary: '#D92D2D', ink: '#111111', __typename: 'ThemeTokens' } as Partial<
      Record<string, string>
    >;
    const input = toThemeTokensInput(stored);
    expect(input).toEqual({ ...emptyThemeTokens(), primary: '#D92D2D', ink: '#111111' });
    expect(Object.keys(input)).toEqual(TOKEN_ROWS.map((row) => row.key));
  });
});

describe('tokenRows — primaryTokens with a full hex', () => {
  it('moves hover and pressed to progressively darker fills with a readable label colour', () => {
    const next = primaryTokens('#D92D2D');
    expect(Object.keys(next).sort()).toEqual(['onPrimary', 'primary', 'primaryActive', 'primaryHover']);
    expect(next.primary).toBe('#D92D2D');
    const { primaryHover = '', primaryActive = '', onPrimary = '' } = next;
    for (const value of [primaryHover, primaryActive, onPrimary]) expect(isTokenValueValid(value)).toBe(true);
    // Darker fills stand out more against white: primary < hover < pressed.
    const vsWhite = (color: string) => contrastRatio(color, '#FFFFFF');
    expect(vsWhite(primaryHover)).toBeGreaterThan(vsWhite('#D92D2D'));
    expect(vsWhite(primaryActive)).toBeGreaterThan(vsWhite(primaryHover));
    expect(contrastRatio(onPrimary, '#D92D2D')).toBeGreaterThanOrEqual(3);
  });
});

describe('tokenRows — tokenContrast against an unmeasurable ground', () => {
  it('skips a ground typed as rgba() and reports the worst of the measurable ones', () => {
    const inkRow = TOKEN_ROWS.find((row) => row.key === 'ink');
    if (!inkRow) throw new Error('ink row missing');
    const values = { ...emptyThemeTokens(), ink: '#000000', bg: 'rgba(255, 255, 255, 0.5)' };
    const result = tokenContrast(values, light, inkRow);
    expect(result).not.toBeNull();
    expect(result?.pair).not.toBe('bg');
    expect(inkRow.against).toContain(result?.pair);
  });
});
