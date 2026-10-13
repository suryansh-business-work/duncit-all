import '../../../../__tests__/helpers/agGridEnv';
import '../../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import DeletionRefundsPage from './DeletionRefundsPage';
import { orderRow } from '../orders/__tests__/fixtures';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

const TABLE = 'PartnerDeletionRefundsTable';
const OPTIONS = 'PartnerBrandOptions';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const page = (rows: unknown[]) => ({
  myDeletionRefundsTable: { __typename: 'ProductOrderTablePage', total: rows.length, rows },
});
const brandOption = (id: string, name: string) => ({ __typename: 'EcommBrand', id, brand_name: name, status: 'APPROVED' });

const refunded = orderRow({
  id: 'o9',
  order_no: 'ORD-9009',
  buyer_name: 'Meera Iyer',
  brand_name: 'Aurora Pets',
  fulfilment_status: 'CANCELLED',
  cancelled_at: '2026-07-03T08:00:00.000Z',
  deletion_request_no: 'DR-12',
  refund: { ...orderRow().refund, status: 'PROCESSED', amount: 600, coins: 25, refunded_at: '2026-07-04T08:00:00.000Z' },
});
const failed = orderRow({
  id: 'o10',
  order_no: 'ORD-9010',
  buyer_name: 'Ravi Kumar',
  brand_name: '',
  fulfilment_status: 'CANCELLED',
  cancelled_at: null,
  deletion_request_no: '',
  refund: { ...orderRow().refund, status: 'FAILED', error: 'Bank rejected' },
});

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<DeletionRefundsPage />, {
    route: '/ecomm-brand/deletion-refunds',
    link: scriptedLink(
      {
        [TABLE]: page([refunded, failed]),
        [OPTIONS]: { myEcommBrands: [brandOption('b1', 'Aurora Pets'), brandOption('b2', 'Blue Kettle')] },
        ...answers,
      },
      sent,
    ),
  });

const rowOf = async (text: string) => (await screen.findByText(text)).closest('[role="row"]') as HTMLElement;

describe('DeletionRefundsPage', () => {
  it('lists each cancelled order with its request, brand and where the refund stands', async () => {
    mount();
    const ok = within(await rowOf('ORD-9009'));
    expect(ok.getByText('DR-12')).toBeTruthy();
    expect(ok.getByText('Aurora Pets')).toBeTruthy();
    expect(ok.getByText('Refunded')).toBeTruthy();
    expect(ok.getByText('25')).toBeTruthy();

    const bad = within(await rowOf('ORD-9010'));
    expect(bad.getByText('Refund failed — Duncit Finance will pay it out')).toBeTruthy();
    // Missing request number, brand name and cancel date read as dashes.
    expect(bad.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('shows the empty state', async () => {
    mount({ [TABLE]: page([]) });
    expect(await screen.findByText('No order has been cancelled by a deletion request yet.')).toBeTruthy();
  });

  it('opens the order from its row', async () => {
    mount();
    fireEvent.click(await screen.findByText('ORD-9009'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/orders/o9'));
  });

  it('reloads the refunds for the brand that is picked', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    const picker = await screen.findByTestId('brand-picker');
    expect(sent.find((op) => op.name === TABLE)?.variables).toMatchObject({ brand_id: null });
    fireEvent.mouseDown(within(picker).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Blue Kettle' }));

    await waitFor(() =>
      expect(sent.filter((op) => op.name === TABLE).map((op) => op.variables.brand_id)).toContain('b2'),
    );
  });
});
