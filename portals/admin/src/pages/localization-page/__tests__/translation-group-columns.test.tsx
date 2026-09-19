import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTranslationGroupColumns } from '../translation-group-columns';
import { translatedFor, type LocaleRow, type TranslationGroupRow } from '../queries';

const locale = (code: string, label: string): LocaleRow => ({
  id: `loc-${code}`,
  code,
  label,
  english_label: label,
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
});

const group = (over: Partial<TranslationGroupRow> = {}): TranslationGroupRow => ({
  id: 'mweb.shop',
  surface: 'mweb',
  page: 'shop',
  key_count: 12,
  locales: [
    { locale: 'en-IN', translated: 12 },
    { locale: 'hi-IN', translated: 4 },
    { locale: 'ta-IN', translated: 0 },
  ],
  ...over,
});

const t = (key: string) => key;

const columnsFor = (locales: LocaleRow[]) => getTranslationGroupColumns(locales, t);

const renderCell = (locales: LocaleRow[], field: string, row: TranslationGroupRow) => {
  const column = columnsFor(locales).find((c) => c.field === field);
  if (!column?.cellRenderer) throw new Error(`no renderer for ${field}`);
  return render(<>{column.cellRenderer(row) as ReactNode}</>);
};

describe('getTranslationGroupColumns', () => {
  it('adds one completeness column per active locale, headed by its name or else its code', () => {
    const columns = columnsFor([locale('en-IN', 'English'), locale('xx-YY', '')]);
    expect(columns.map((c) => c.field)).toEqual([
      'surface',
      'page',
      'key_count',
      'translated_en-IN',
      'translated_xx-YY',
    ]);
    expect(columns.map((c) => c.headerName).slice(3)).toEqual(['English', 'xx-YY']);
  });

  it('shows translated / total for a complete, a partial and an untouched language', () => {
    const locales = [locale('en-IN', 'English'), locale('hi-IN', 'हिन्दी'), locale('ta-IN', 'தமிழ்')];
    const complete = renderCell(locales, 'translated_en-IN', group());
    expect(complete.container).toHaveTextContent('12/ 12');
    complete.unmount();

    const partial = renderCell(locales, 'translated_hi-IN', group());
    expect(partial.container).toHaveTextContent('4/ 12');
    partial.unmount();

    renderCell(locales, 'translated_ta-IN', group());
    expect(screen.getByText('0/ 12')).toBeInTheDocument();
  });

  it('chips the surface and names the page, dashing either when blank', () => {
    const named = renderCell([], 'surface', group());
    expect(named.container.querySelector('.MuiChip-root')).toHaveTextContent('mweb');
    named.unmount();

    const blankSurface = renderCell([], 'surface', group({ surface: '' }));
    expect(blankSurface.container).toHaveTextContent('—');
    blankSurface.unmount();

    const page = renderCell([], 'page', group());
    expect(page.container).toHaveTextContent('shop');
    expect(page.container).toHaveTextContent('mweb.shop');
    page.unmount();

    renderCell([], 'page', group({ page: '', id: 'mweb' }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('translatedFor', () => {
  it('reads a locale’s count, and zero for a locale the namespace has no entry for yet', () => {
    expect(translatedFor(group(), 'hi-IN')).toBe(4);
    expect(translatedFor(group(), 'fr-FR')).toBe(0);
  });
});
