import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTranslationColumns } from '../translation-columns';
import type { LocaleRow, TranslationRow } from '../queries';

const t = (key: string) => key;
const formatDateTime = (value: string) => `FMT:${value}`;

const makeLocale = (over: Partial<LocaleRow> = {}): LocaleRow => ({
  id: 'loc1',
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: 'Hindi',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
  updated_at: null,
  ...over,
});

const makeRow = (over: Partial<TranslationRow> = {}): TranslationRow => ({
  id: 'row1',
  key: 'admin.foo.bar',
  surface: 'admin',
  page: 'dashboard',
  description: 'A description',
  values: [{ key: 'en-IN', value: 'Hello' }],
  updated_at: '2026-01-02T00:00:00.000Z',
  ...over,
});

const columnBy = (field: string, locales: LocaleRow[] = []) => {
  const col = getTranslationColumns({ locales, formatDateTime, t }).find((c) => c.field === field);
  if (!col) throw new Error(`column ${field} not built`);
  return col;
};

describe('getTranslationColumns / column set', () => {
  it('builds the four fixed columns with no locale columns when there are no active locales', () => {
    const fields = getTranslationColumns({ locales: [], formatDateTime, t }).map((c) => c.field);
    expect(fields).toEqual(['key', 'surface', 'page', 'updated_at']);
  });

  it('inserts one column per locale between page and updated_at', () => {
    const locales = [makeLocale({ code: 'en-IN' }), makeLocale({ code: 'hi-IN', label: 'हिन्दी' })];
    const fields = getTranslationColumns({ locales, formatDateTime, t }).map((c) => c.field);
    expect(fields).toEqual(['key', 'surface', 'page', 'value_en-IN', 'value_hi-IN', 'updated_at']);
  });

  it('labels the fixed headers with their translation keys', () => {
    const headers = Object.fromEntries(
      getTranslationColumns({ locales: [], formatDateTime, t }).map((c) => [c.field, c.headerName]),
    );
    expect(headers).toMatchObject({
      key: 'admin.podPlans.key',
      surface: 'admin.roles.portal',
      page: 'admin.activity.page',
      updated_at: 'shell.common.updated',
    });
  });

  it('marks the fixed columns sortable and the locale columns not sortable', () => {
    const locales = [makeLocale({ code: 'en-IN' })];
    const cols = getTranslationColumns({ locales, formatDateTime, t });
    expect(cols.find((c) => c.field === 'key')?.sortable).toBe(true);
    expect(cols.find((c) => c.field === 'surface')?.sortable).toBe(true);
    expect(cols.find((c) => c.field === 'page')?.sortable).toBe(true);
    expect(cols.find((c) => c.field === 'updated_at')?.sortable).toBe(true);
    expect(cols.find((c) => c.field === 'value_en-IN')?.sortable).toBe(false);
  });

  it('labels a locale column with its label, falling back to its code when the label is blank', () => {
    const withLabel = columnBy('value_hi-IN', [makeLocale({ code: 'hi-IN', label: 'हिन्दी' })]);
    expect(withLabel.headerName).toBe('हिन्दी');
    const withoutLabel = columnBy('value_fr-FR', [makeLocale({ code: 'fr-FR', label: '' })]);
    expect(withoutLabel.headerName).toBe('fr-FR');
  });
});

describe('getTranslationColumns / key column', () => {
  it('renders the key in bold plus the description caption when present', () => {
    render(<>{columnBy('key').cellRenderer?.(makeRow({ key: 'admin.foo', description: 'Some hint' }))}</>);
    expect(screen.getByText('admin.foo')).toBeInTheDocument();
    expect(screen.getByText('Some hint')).toBeInTheDocument();
  });

  it('omits the description caption when the row has no description', () => {
    const { container } = render(<>{columnBy('key').cellRenderer?.(makeRow({ key: 'admin.bar', description: '' }))}</>);
    expect(container.textContent).toBe('admin.bar');
  });
});

describe('getTranslationColumns / surface + page columns', () => {
  it('renders a filled chip for a non-empty surface', () => {
    render(<>{columnBy('surface').cellRenderer?.(makeRow({ surface: 'mweb' }))}</>);
    expect(screen.getByText('mweb')).toBeInTheDocument();
  });

  it('dashes an empty surface', () => {
    const { container } = render(<>{columnBy('surface').cellRenderer?.(makeRow({ surface: '' }))}</>);
    expect(container.textContent).toBe('—');
  });

  it('renders an outlined chip for a non-empty page', () => {
    render(<>{columnBy('page').cellRenderer?.(makeRow({ page: 'shop' }))}</>);
    expect(screen.getByText('shop')).toBeInTheDocument();
  });

  it('dashes an empty page', () => {
    const { container } = render(<>{columnBy('page').cellRenderer?.(makeRow({ page: '' }))}</>);
    expect(container.textContent).toBe('—');
  });
});

describe('getTranslationColumns / locale columns', () => {
  const locale = makeLocale({ code: 'hi-IN', label: 'हिन्दी' });

  it('shows the translated text with a title tooltip when a value exists for that locale', () => {
    const row = makeRow({ values: [{ key: 'hi-IN', value: 'नमस्ते' }] });
    render(<>{columnBy('value_hi-IN', [locale]).cellRenderer?.(row)}</>);
    expect(screen.getByText('नमस्ते')).toHaveAttribute('title', 'नमस्ते');
  });

  it('marks the cell "not translated" when the row has no value for that locale', () => {
    const row = makeRow({ values: [] });
    render(<>{columnBy('value_hi-IN', [locale]).cellRenderer?.(row)}</>);
    expect(screen.getByText(/not translated/)).toBeInTheDocument();
  });

  it('marks the cell "not translated" when the row has other locales but not this one', () => {
    const row = makeRow({ values: [{ key: 'en-IN', value: 'Hello' }] });
    render(<>{columnBy('value_hi-IN', [locale]).cellRenderer?.(row)}</>);
    expect(screen.getByText(/not translated/)).toBeInTheDocument();
  });
});

describe('getTranslationColumns / updated_at value', () => {
  it('formats the updated timestamp through the injected formatter', () => {
    const col = columnBy('updated_at');
    expect(col.valueGetter?.(makeRow({ updated_at: '2026-01-02T00:00:00.000Z' }))).toBe(
      'FMT:2026-01-02T00:00:00.000Z',
    );
  });

  it('dashes a missing updated timestamp', () => {
    const col = columnBy('updated_at');
    expect(col.valueGetter?.(makeRow({ updated_at: null }))).toBe('—');
  });
});
