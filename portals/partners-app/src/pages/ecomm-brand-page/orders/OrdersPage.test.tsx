import '../../../../__tests__/helpers/agGridEnv';
import '../../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import OrdersPage from './OrdersPage';
import { bookedOrder, orderRow } from './__tests__/fixtures';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

const TABLE = 'PartnerBrandProductOrdersTable';
const OPTIONS = 'PartnerBrandOptions';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const page = (rows: unknown[]) => ({
  brandProductOrdersTable: { __typename: 'ProductOrderTablePage', total: rows.length, rows },
});
const brandOption = (id: string, name: string, status = 'DRAFT') => ({ __typename: 'EcommBrand', id, brand_name: name, status });

const cancelled = orderRow({
  id: 'o3',
  order_no: 'ORD-1003',
  buyer_name: 'Ravi Kumar',
  fulfilment_status: 'CANCELLED',
  cancelled_at: '2026-07-03T08:00:00.000Z',
  refund: { ...orderRow().refund, status: 'PROCESSED', amount: 600 },
});
const rows = [
  orderRow(),
  bookedOrder({ id: 'o2', order_no: 'ORD-1002', buyer_name: 'Sana Khan', line_items: [orderRow().line_items[0]], total: 500 }),
  cancelled,
];

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<OrdersPage />, {
    route: '/ecomm-brand/orders',
    link: scriptedLink(
      {
        [TABLE]: page(rows),
        [OPTIONS]: { myEcommBrands: [brandOption('b1', 'Aurora Pets')] },
        ...answers,
      },
      sent,
    ),
  });

const rowOf = async (text: string) => (await screen.findByText(text)).closest('[role="row"]') as HTMLElement;

describe('OrdersPage table', () => {
  it('summarises each order: buyer, items, total, delivery, status, refund and AWB', async () => {
    mount();
    const first = within(await rowOf('ORD-1001'));
    expect(first.getByText('Meera Iyer')).toBeTruthy();
    expect(first.getByText('Pet Collar × 2 +1')).toBeTruthy();
    expect(first.getByText(/600\.00/)).toBeTruthy();
    // No refund owed and no AWB yet: both read as a dash.
    expect(first.getAllByText('—').length).toBeGreaterThanOrEqual(2);

    const booked = within(await rowOf('ORD-1002'));
    expect(booked.getByText('Pet Collar × 2')).toBeTruthy();
    expect(booked.getByText('AWB123')).toBeTruthy();

    const refunded = within(await rowOf('ORD-1003'));
    expect(refunded.getByText('Refunded')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    mount({ [TABLE]: page([]) });
    expect(await screen.findByText('No orders yet.')).toBeTruthy();
  });

  it('opens an order from its row', async () => {
    mount();
    fireEvent.click(await screen.findByText('ORD-1002'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/orders/o2'));
  });
});

describe('OrdersPage brands', () => {
  it('asks for every brand first and offers to delete the only one', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    expect((await screen.findByTestId('brand-danger-delete')).textContent).toBe('Delete this brand');
    expect(screen.queryByTestId('brand-picker')).toBeNull();
    expect(sent.find((op) => op.name === TABLE)?.variables).toMatchObject({ brand_id: null });
  });

  it('filters the orders by the picked brand and reloads', async () => {
    const sent: SentOperation[] = [];
    mount({ [OPTIONS]: { myEcommBrands: [brandOption('b1', 'Aurora Pets'), brandOption('b2', 'Blue Kettle', 'APPROVED')] } }, sent);
    const picker = await screen.findByTestId('brand-picker');
    // Two brands and "All brands": nothing is picked, so there is no brand to delete.
    expect(screen.queryByTestId('brand-danger-delete')).toBeNull();
    fireEvent.mouseDown(within(picker).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Blue Kettle' }));

    await waitFor(() => expect(within(picker).getByRole('combobox').textContent).toBe('Blue Kettle'));
    await waitFor(
      () => expect(sent.filter((op) => op.name === TABLE).map((op) => op.variables.brand_id)).toContain('b2'),
      { timeout: 4000 },
    );
    expect((await screen.findByTestId('brand-danger-delete')).textContent).toBe('Delete this brand');
  });
});
