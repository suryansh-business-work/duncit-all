import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setAmbientDateSettings } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { SITE_URL } from '../../../../shared/env';
import { LITE_ADMIN_REGISTRATIONS_TABLE, type LiteAdminRegistrationRow } from '../../../graphql/registrations';
import { RegistrationsPage } from '../../../pages/registrations';
import { buildRegistrationColumns, registrationRowId } from '../../../pages/registrations/columns';
import { makeRegistration } from '../../fixtures';
import { gqlRegistration, tablePage } from '../../gql-results';
import { findRow, portalT, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const columns = buildRegistrationColumns(portalT);
const column = (field: string): DuncitColumn<LiteAdminRegistrationRow> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const value = (field: string, row: LiteAdminRegistrationRow) => column(field).valueGetter?.(row);

describe('registration columns', () => {
  it('keys rows by id and heads the columns in English', () => {
    expect(registrationRowId(makeRegistration())).toBe('reg-1');
    expect(columns.map((c) => c.headerName)).toEqual(['Guest', 'Email', 'Event', 'Ticket', 'Qty', 'Amount due', 'Status', 'Payment', 'UTR', 'Code', 'Created']);
  });

  it('reads the guest and event off the nested objects and sorts on the stored copies', () => {
    expect(value('user_name', makeRegistration())).toBe('Ravi Kumar');
    expect(value('event_title', makeRegistration())).toBe('Jazz Night');
    expect(column('user.email')).toMatchObject({ sortable: false, filterable: false });
  });

  it('links the event to its public page', () => {
    render(<>{column('event_title').cellRenderer?.(makeRegistration())}</>);
    expect(screen.getByRole('link', { name: 'Open Jazz Night on the site' })).toHaveAttribute('href', `${SITE_URL}/e/jazz-night`);
  });

  it('shows the amount in rupees with Indian grouping', () => {
    expect(value('amount_due', makeRegistration({ amount_due: 125_000 }))).toBe('₹1,25,000');
    expect(value('amount_due', makeRegistration({ amount_due: 0 }))).toBe('₹0');
  });

  it('exports the status and payment in words, with chips coloured by outcome', () => {
    expect(value('status', makeRegistration({ status: 'WAITLISTED' }))).toBe('Waitlisted');
    expect(value('payment_status', makeRegistration({ payment_status: 'REJECTED' }))).toBe('Payment rejected');
    render(<>{column('payment_status').cellRenderer?.(makeRegistration({ payment_status: 'REJECTED' }))}</>);
    expect(screen.getByText('Payment rejected').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
  });

  it('shows the UTR or a dash when the guest has not paid by UPI', () => {
    expect(value('payment_reference', makeRegistration())).toBe('UTR123456');
    expect(value('payment_reference', makeRegistration({ payment_reference: null }))).toBe(EM_DASH);
  });

  it('shows the booking date', () => {
    expect(value('created_at', makeRegistration())).toBe('2026-03-10');
  });
});

describe('RegistrationsPage', () => {
  it('lists the registrations read-only, newest first', async () => {
    const table: GqlMock = {
      request: { query: LITE_ADMIN_REGISTRATIONS_TABLE, variables: (vars: { query?: { sort_by?: string; sort_dir?: string } }) => vars.query?.sort_by === 'created_at' && vars.query.sort_dir === 'desc' },
      result: { data: { liteAdminRegistrationsTable: tablePage('LiteAdminRegistrationsPage', [gqlRegistration(makeRegistration())]) } },
    };
    renderWithProviders(<RegistrationsPage />, { mocks: [table] });
    expect(screen.getByRole('heading', { level: 1, name: 'Registrations' })).toBeInTheDocument();
    expect(screen.getByText('Every ticket on Duncit Lite, read-only.')).toBeInTheDocument();
    const row = await findRow('reg-1');
    expect(row.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(row.getByText('LT-7Q2X')).toBeInTheDocument();
    expect(row.queryByRole('button')).not.toBeInTheDocument();
  });
});
