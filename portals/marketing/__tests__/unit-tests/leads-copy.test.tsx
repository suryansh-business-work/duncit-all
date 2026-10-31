import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { fetchRowsFrom } from './table-mock';
import { makeLeadRow } from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));

import { DuncitTable } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  CRM_KIND_FOR_PIPELINE,
  FINAL_STAGES,
  PIPELINES,
  STAGES,
  STAGE_COLORS,
  isLeadPipeline,
  isLeadStage,
} from '../../src/pages/leads-page/copy';
import { pinnedLeadFilters } from '../../src/pages/leads-page/leadFilters';
import { canPickOwner, canPromote } from '../../src/pages/leads-page/roles';
import { crmLeadUrl } from '../../src/pages/leads-page/crmLink';
import { LeadStageChip, getLeadColumns } from '../../src/pages/leads-page/leadColumns';
import type { MarketingLeadRow } from '../../src/pages/leads-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;
const fmt = (date: Date) => `fmt:${date.toISOString()}`;

describe('the vocabulary', () => {
  it('knows which values off the URL name a stage or a pipeline', () => {
    expect(STAGES.every(isLeadStage)).toBe(true);
    expect(isLeadStage('WON')).toBe(false);
    expect(isLeadStage(null)).toBe(false);
    expect(PIPELINES.every(isLeadPipeline)).toBe(true);
    expect(isLeadPipeline('SELLER')).toBe(false);
    expect(FINAL_STAGES).toEqual(['CONVERTED', 'LOST']);
    expect(STAGES.map((stage) => STAGE_COLORS[stage])).toEqual(['default', 'info', 'primary', 'warning', 'success', 'error']);
  });

  it('maps each promotable pipeline to its CRM record and leaves the rest without one', () => {
    expect(CRM_KIND_FOR_PIPELINE).toEqual({ VENUE: 'VENUE', HOST: 'HOST', BRAND: 'ECOMM', ADVERTISER: 'ECOMM' });
    expect(CRM_KIND_FOR_PIPELINE.INFLUENCER).toBeUndefined();
    expect(CRM_KIND_FOR_PIPELINE.GENERAL).toBeUndefined();
  });
});

describe('pinnedLeadFilters', () => {
  it('pins a stage and a pipeline the URL names, and ignores values that name nothing', () => {
    expect(pinnedLeadFilters(new URLSearchParams(''))).toEqual([]);
    expect(pinnedLeadFilters(new URLSearchParams('stage=QUALIFIED&pipeline=VENUE'))).toEqual([
      { field: 'stage', op: 'eq', value: 'QUALIFIED' },
      { field: 'pipeline', op: 'eq', value: 'VENUE' },
    ]);
    expect(pinnedLeadFilters(new URLSearchParams('stage=WON&pipeline=nope'))).toEqual([]);
  });
});

describe('roles', () => {
  it('lets managers promote and pick owners, admins of a city pick owners only, editors neither', () => {
    expect(canPromote(['MARKETING_MANAGER'])).toBe(true);
    expect(canPromote(['SUPER_ADMIN', 'USER'])).toBe(true);
    expect(canPromote(['CITY_ADMIN'])).toBe(false);
    expect(canPromote(['MARKETING_EDITOR'])).toBe(false);
    expect(canPromote(null)).toBe(false);
    expect(canPickOwner(['CITY_ADMIN'])).toBe(true);
    expect(canPickOwner(['MARKETING_MANAGER'])).toBe(true);
    expect(canPickOwner(['MARKETING_EDITOR'])).toBe(false);
    expect(canPickOwner(undefined)).toBe(false);
  });
});

describe('crmLeadUrl', () => {
  it('points at the CRM record of each kind, on this build’s CRM portal', () => {
    expect(crmLeadUrl('VENUE', 'v1')).toBe('http://localhost:2007/venue-leads/v1/view');
    expect(crmLeadUrl('HOST', 'h1')).toBe('http://localhost:2007/host-leads/h1/view');
    expect(crmLeadUrl('ECOMM', 'e 1')).toBe('http://localhost:2007/ecomm-leads/e%201/view');
  });
});

describe('LeadStageChip', () => {
  it('names the stage', () => {
    const { t } = translator();
    renderWithProviders(<LeadStageChip stage="QUALIFIED" t={t} />);
    expect(screen.getByText('Qualified')).toBeInTheDocument();
  });
});

describe('getLeadColumns', () => {
  const optionsOf = (column: { options?: unknown }) => column.options as { value: string; label: string }[] | undefined;

  it('lists what a lead is, where it stands and who has it, with the enum filters the server matches', () => {
    const { t } = translator();
    const columns = getLeadColumns(t, fmt, vi.fn());
    expect(columns.map((column) => column.headerName)).toEqual(['Lead', 'Pipeline', 'Stage', 'Source', 'Fit', 'Owner', 'City', 'Updated', 'Added', 'Actions']);
    expect(optionsOf(columns[1])?.map((option) => option.value)).toEqual(PIPELINES);
    expect(optionsOf(columns[2])?.map((option) => option.label)).toEqual(['New', 'Contacted', 'Replied', 'Qualified', 'Converted', 'Lost']);
    expect(optionsOf(columns[3])?.map((option) => option.label)).toEqual(['Instagram', 'Google Places', 'Web search', 'Imported', 'Entered by hand']);
    expect(columns[0]).toMatchObject({ field: 'name', filterable: false });
    expect(columns[5]).toMatchObject({ field: 'owner', sortable: false, filterable: false });
    expect(columns[8]).toMatchObject({ field: 'created_at' });
  });

  it('renders each row: name with its company, the stage chip, the fit, the owner, and the open button', () => {
    const { t } = translator();
    const onOpen = vi.fn();
    const rows: MarketingLeadRow[] = [
      makeLeadRow(),
      makeLeadRow({ id: 'l2', name: 'Solo', company: '', score: null, owner_name: null, stage: 'LOST', source: 'MANUAL', pipeline: 'GENERAL' }),
    ];
    renderWithProviders(<DuncitTable columns={getLeadColumns(t, fmt, onOpen)} fetchRows={fetchRowsFrom(rows)} getRowId={(row: MarketingLeadRow) => row.id} />);
    return screen.findAllByTestId('table-row').then((rendered) => {
      const [first, second] = rendered;
      expect(within(first).getByTestId('cell-name')).toHaveTextContent('Blue Cafe · Blue Cafe Pvt');
      expect(within(first).getByTestId('cell-name')).toHaveTextContent('Blue Cafe Pvt');
      expect(within(first).getByTestId('cell-pipeline')).toHaveTextContent('Venue');
      expect(within(first).getByTestId('cell-stage')).toHaveTextContent('New');
      expect(within(first).getByTestId('cell-source')).toHaveTextContent('Instagram');
      expect(within(first).getByTestId('cell-score')).toHaveTextContent('82');
      expect(within(first).getByTestId('cell-owner')).toHaveTextContent('Asha Rao');
      expect(within(first).getByTestId('cell-city')).toHaveTextContent('Pune');
      // The stand-in grid renders a date column's raw value; the real one formats it.
      expect(within(first).getByTestId('cell-updated_at')).toHaveTextContent('2026-10-30T10:00:00.000Z');
      expect(within(second).getByTestId('cell-name')).toHaveTextContent('Solo');
      expect(within(second).getByTestId('cell-score')).toHaveTextContent('—');
      expect(within(second).getByTestId('cell-owner')).toHaveTextContent('Unassigned');
      expect(within(second).getByTestId('cell-stage')).toHaveTextContent('Lost');
      fireEvent.click(within(second).getByRole('button', { name: 'Open lead' }));
      expect(onOpen).toHaveBeenCalledWith(rows[1]);
    });
  });
});
