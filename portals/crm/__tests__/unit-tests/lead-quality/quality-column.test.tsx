import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { CrmLeadsTable } from '@/components/lead-table';
import { buildQualityColumns } from '@/components/lead-table/quality/qualityColumns';
import type { CrmLeadRowBase } from '@/components/lead-table/leadColumns';
import { LEAD_QUALITY, type LeadQualitySummary } from '@/api/leadQuality.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { englishT } from '../helpers/englishT';
import { details, qualityVars } from './fixtures';

vi.mock('@/hooks/useCrmStaffSearch', () => ({
  useCrmStaffSearch: () => ({ users: [], loading: false, error: undefined }),
}));

type Row = CrmLeadRowBase & { venue_name?: string };

const summary: LeadQualitySummary = {
  score: 70,
  classification: 'good',
  classification_label: 'Good',
  tone: 'warning',
  qualification: 'PENDING_VERIFICATION',
  verification: 'IN_PROGRESS',
  failed_gates: 0,
  pending_gates: 0,
  pending_items: 1,
  config_version: 3,
  scored_at: '2026-11-20T10:16:00.000Z',
};

const row = (over: Partial<Row> = {}): Row => ({ id: 'venue-1', lead_status: 'New', priority: 'High', venue_name: 'Grand Hall', quality: summary, ...over });

const columns = () => buildQualityColumns<Row>({ entity: 'venue', nameField: 'venue_name', t: englishT() });
const column = (field: string) => {
  const found = columns().find((c) => c.field === field);
  if (!found) throw new Error(`no ${field} column`);
  return found;
};
const renderCell = (r: Row, mocks: MockedResponse[] = []) => {
  const render = column('quality_score').cellRenderer as (value: Row) => ReactNode;
  return renderWithApollo(<>{render(r)}</>, mocks, { route: '/venue-leads' });
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('Quality Score column', () => {
  it('is a numeric column on the server sort/filter key, and exports the number', () => {
    const score = column('quality_score');
    expect(score).toMatchObject({ field: 'quality_score', headerName: 'Quality Score', type: 'number' });
    expect(score.hide).toBeFalsy();
    expect(score.valueGetter?.(row())).toBe(70);
    expect(score.valueGetter?.(row({ quality: null }))).toBeNull();
  });

  it('adds hidden Qualification and Verification columns to filter by, labelled in words', () => {
    const qualification = column('quality_qualification');
    const verification = column('quality_verification');

    // Filterable, never sorted: the server sorts listings by quality_score only.
    expect(qualification).toMatchObject({ type: 'enum', hide: true, sortable: false, headerName: 'Qualification' });
    expect(qualification.type === 'enum' && qualification.options).toEqual([
      { value: 'QUALIFIED', label: 'Qualified' },
      { value: 'NOT_QUALIFIED', label: 'Not qualified' },
      { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
    ]);
    expect(verification).toMatchObject({ type: 'enum', hide: true, sortable: false, headerName: 'Verification' });
    expect(verification.type === 'enum' && verification.options).toHaveLength(3);

    expect(qualification.valueGetter?.(row())).toBe('Pending verification');
    expect(verification.valueGetter?.(row())).toBe('Verification in progress');
    expect(qualification.valueGetter?.(row({ quality: null }))).toBe('');
  });

  it('shows the ring, classification and qualification; the ring opens the lead on its Quality Score tab', () => {
    renderCell(row());

    expect(screen.getByRole('img', { name: 'Quality score 70 out of 100, Good' })).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Pending verification')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open the quality score breakdown (70/100)' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads/venue-1/view?selectedtab=quality');
  });

  it('shows a lead that was never scored as not scored, with no qualification', () => {
    renderCell(row({ quality: null }));

    expect(screen.getByRole('img', { name: 'Not scored yet' })).toBeInTheDocument();
    expect(screen.getByText('Not scored yet')).toBeInTheDocument();
    expect(screen.queryByText('Pending verification')).not.toBeInTheDocument();
  });

  it('quick view loads the breakdown only when opened and lists each criterion with earned/max and status', async () => {
    const answer = vi.fn(() => ({ data: { crmLeadQuality: details() } }));
    renderCell(row(), [{ request: { query: LEAD_QUALITY, variables: qualityVars }, result: answer }]);

    expect(answer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quality breakdown of Grand Hall' }));

    const dialog = await screen.findByRole('dialog', { name: 'Quality breakdown' });
    const list = await within(dialog).findByTestId('lead-quality-quickview-list');
    expect(answer).toHaveBeenCalledTimes(1);
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((li) => li.textContent)).toEqual([
      'Instagram presence20/30Partial',
      'Google Maps listing40/40Verified',
      'Website10/30Partial',
      'Total70/100',
    ]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Open full breakdown' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads/venue-1/view?selectedtab=quality');
  });

  it('quick view says when the breakdown could not be loaded', async () => {
    renderCell(row(), [{ request: { query: LEAD_QUALITY, variables: qualityVars }, error: new Error('Quality is unavailable') }]);
    fireEvent.click(screen.getByRole('button', { name: 'Quality breakdown of Grand Hall' }));

    expect(await screen.findByText(/The breakdown could not be loaded\. Quality is unavailable/)).toBeInTheDocument();
  });
});

describe('CrmLeadsTable with the Quality Score', () => {
  it('lists every lead with its score ring right after the name, and offers Recalculate scores', async () => {
    const fetchRows = vi.fn(async () => ({ rows: [row(), row({ id: 'venue-2', venue_name: 'Copy Hall', quality: null })], total: 2 }));
    renderWithApollo(
      <CrmLeadsTable
        entity="venue"
        fetchRows={fetchRows}
        refetchRef={{ current: null }}
        statusOptions={[]}
        priorityOptions={[]}
        superCategoryOptions={[]}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(await screen.findByRole('img', { name: 'Quality score 70 out of 100, Good' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Not scored yet' })).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recalculate scores' })).toBeInTheDocument();
    await waitFor(() => expect(fetchRows).toHaveBeenCalled());
  });
});
