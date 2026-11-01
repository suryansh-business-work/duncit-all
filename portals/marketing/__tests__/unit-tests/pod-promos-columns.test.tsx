import { describe, expect, it, vi } from 'vitest';
import { renderHook, screen } from '@testing-library/react';
import { formatINR } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makePodPromo, makePodPromoFigures } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));

import { getPromoColumns } from '../../src/pages/pod-promos-page/promos/promoColumns';
import type { PodPromo } from '../../src/pages/pod-promos-page/queries';

const translator = () => renderHook(() => useTranslation()).result.current.t;

const columnsFor = () => getPromoColumns(translator(), 'en-IN');
const column = (field: string) => {
  const found = columnsFor().find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const value = (field: string, row: PodPromo) => column(field).valueGetter?.(row);
/** The filter choices an enum column offers. */
const optionsOf = (field: string) => ('options' in column(field) ? (column(field) as { options: unknown }).options : undefined);

describe('getPromoColumns', () => {
  it('lists the pod, its start, status, source, post time, banner and what it brought in', () => {
    expect(columnsFor().map((c) => c.headerName)).toEqual([
      'Pod',
      'Pod starts',
      'Status',
      'Made by',
      'Posts at',
      'Banner',
      'Clicks',
      'Bookings',
      'Revenue',
    ]);
  });

  it('reads each figure, the status and the source as people say them', () => {
    const row = makePodPromo({ source: 'MANUAL', figures: makePodPromoFigures({ clicks: 1200, bookings: 4, revenue: 999 }) });
    expect(value('pod_title', row)).toBe('Sunset Run');
    expect(value('status', row)).toBe('Scheduled');
    expect(value('source', row)).toBe('By hand');
    expect(value('clicks', row)).toBe((1200).toLocaleString('en-IN'));
    expect(value('bookings', row)).toBe('4');
    expect(value('revenue', row)).toBe(formatINR(999));
    expect(optionsOf('status')).toHaveLength(7);
    expect(optionsOf('source')).toEqual([
      { value: 'AUTO', label: 'Planner' },
      { value: 'MANUAL', label: 'By hand' },
    ]);
  });

  it('draws the pod with its club and city, the status chip and the banner thumbnail', () => {
    const row = makePodPromo();
    renderWithProviders(
      <>
        {column('pod_title').cellRenderer?.(row)}
        {column('status').cellRenderer?.(row)}
        {column('banner_url').cellRenderer?.(row)}
      </>
    );
    expect(screen.getByText('Pune Runners · Pune')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Promotion banner for Sunset Run' })).toHaveAttribute('src', row.banner_url);
  });

  it('shows a dash for a promotion with no banner yet, and only the club when the city is unknown', () => {
    const row = makePodPromo({ banner_url: '', city_name: '' });
    renderWithProviders(
      <>
        {column('pod_title').cellRenderer?.(row)}
        {column('banner_url').cellRenderer?.(row)}
      </>
    );
    expect(screen.getByText('Pune Runners')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
