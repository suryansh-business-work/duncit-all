import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LocalesTable from '../LocalesTable';
import type { LocaleRow } from '../queries';

const locale = (over: Partial<LocaleRow>): LocaleRow => ({
  id: 'l1',
  code: 'en-IN',
  label: 'English',
  english_label: 'English (India)',
  is_rtl: false,
  is_active: true,
  is_default: true,
  sort_order: 0,
  ...over,
});

const ENGLISH = locale({});
const HINDI = locale({ id: 'l2', code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi (India)', is_default: false });

const rowFor = (code: string) => screen.getByText(code).closest('tr') as HTMLElement;

describe('LocalesTable — coverage', () => {
  it('shows how much of the catalogue each language carries, and a dash where it is unknown', () => {
    render(
      <LocalesTable
        rows={[ENGLISH, HINDI]}
        coverage={{ 'hi-IN': { locale: 'hi-IN', total_keys: 900, translated_keys: 860 } }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAutoTranslate={vi.fn()}
      />,
    );

    expect(within(rowFor('hi-IN')).getByText('860 of 900 keys')).toBeInTheDocument();
    expect(within(rowFor('en-IN')).queryByText(/ of .* keys$/)).toBeNull();
  });

  it('opens auto-translate for the row it was pressed on', () => {
    const onAutoTranslate = vi.fn();
    render(
      <LocalesTable rows={[ENGLISH, HINDI]} coverage={{}} onEdit={vi.fn()} onDelete={vi.fn()} onAutoTranslate={onAutoTranslate} />,
    );

    fireEvent.click(within(rowFor('hi-IN')).getByTestId('locales-table-auto-translate'));
    expect(onAutoTranslate).toHaveBeenCalledWith(HINDI);
    expect(within(rowFor('en-IN')).getByTestId('locales-table-auto-translate')).toBeDisabled();
  });
});
