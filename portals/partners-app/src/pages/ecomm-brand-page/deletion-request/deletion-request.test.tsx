import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import DeletionRequestDialog from './DeletionRequestDialog';
import WithdrawDeletionDialog from './WithdrawDeletionDialog';
import { useDeletionRequests } from './useDeletionRequests';
import type { DeletionTarget } from './deletion-request.types';
import { renderWithProviders } from '../../../__tests__/render';
import { recordNotices } from '../../../__tests__/groupC-notices';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

/**
 * MUI X's sectioned field cannot be typed into under jsdom, so the picker is a stub
 * that shows the helper text it was given and fires what a real DatePicker emits.
 */
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: { slotProps: { textField: { helperText: string } }; onChange: (day: Date | null) => void }) => (
    <div data-testid="picker">
      <button type="button" onClick={() => props.onChange(new Date(2026, 10, 15))}>
        pick inside
      </button>
      <button type="button" onClick={() => props.onChange(new Date(2027, 0, 5))}>
        pick outside
      </button>
      <button type="button" onClick={() => props.onChange(null)}>
        clear day
      </button>
      <small>{props.slotProps.textField.helperText}</small>
    </div>
  ),
}));

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const target: DeletionTarget = { kind: 'PRODUCT', id: 'p1', name: 'Chew toy' };

const order = (over: Record<string, unknown> = {}) => ({
  __typename: 'CatalogDeletionOrder',
  id: 'o1',
  order_no: 'ORD-1',
  fulfilment_status: 'PLACED',
  created_at: '2026-10-01T10:00:00.000Z',
  buyer_name: 'Ravi',
  total: 499,
  currency_symbol: '$',
  units: 2,
  ...over,
});

const preview = (orders: unknown[] = [order()], over: Record<string, unknown> = {}) => ({
  catalogDeletionPreview: {
    __typename: 'CatalogDeletionPreview',
    kind: 'PRODUCT',
    brand_name: 'Aurora Pets',
    product_name: 'Chew toy',
    window: { __typename: 'CatalogDeletionWindow', earliest: '2026-11-01', latest: '2026-12-01' },
    impact: {
      __typename: 'CatalogDeletionImpact',
      open_orders: orders.length,
      open_returns: 0,
      orders,
      products: [],
    },
    ...over,
  },
});

const requestRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'CatalogDeletionRequest',
  id: 'r1',
  kind: 'PRODUCT',
  brand_id: 'b1',
  product_id: 'p1',
  parent_id: null,
  status: 'PENDING',
  scheduled_for: '2026-11-01',
  blocked_reason: '',
  ...over,
});

const mountDialog = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
  const onDone = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<DeletionRequestDialog target={target} onClose={onClose} onDone={onDone} />, {
    link: scriptedLink({ PartnerCatalogDeletionPreview: preview(), ...answers }, sent),
  });
  return { onDone, onClose };
};

describe('DeletionRequestDialog', () => {
  it('shows the running orders in the currency they were paid in, and falls back to the rupee', async () => {
    mountDialog({
      PartnerCatalogDeletionPreview: preview([order(), order({ id: 'o2', order_no: 'ORD-2', buyer_name: 'Mina', currency_symbol: '' })]),
    });
    const list = within(await screen.findByRole('list', { name: 'Running orders' }));
    expect(list.getByText(/Ravi · \$499\.00/)).toBeTruthy();
    expect(list.getByText(/Mina · ₹499\.00/)).toBeTruthy();
  });

  it('raises the request for the first allowed day, waiting for running orders, and reports it', async () => {
    const sent: SentOperation[] = [];
    const { onDone, onClose } = mountDialog({ PartnerRequestCatalogDeletion: { requestCatalogDeletion: requestRow() } }, sent);
    fireEvent.click(await screen.findByTestId('deletion-request-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'PartnerRequestCatalogDeletion')?.variables).toEqual({
      input: { kind: 'PRODUCT', target_id: 'p1', mode: 'WAIT_FOR_ORDERS', scheduled_for: '2026-11-01', reason: null },
    });
    expect(messages()).toContain('Deletion request sent for Chew toy. It is off the shop while the Products team reviews it.');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends the chosen day, mode and trimmed reason', async () => {
    const sent: SentOperation[] = [];
    const { onDone } = mountDialog({ PartnerRequestCatalogDeletion: { requestCatalogDeletion: requestRow() } }, sent);
    await screen.findByTestId('deletion-request-form');
    fireEvent.click(screen.getByText('pick inside'));
    fireEvent.click(within(screen.getByTestId('deletion-mode-cancel')).getByRole('radio'));
    fireEvent.change(within(screen.getByTestId('deletion-request-reason')).getByRole('textbox', { name: /Reason/ }), {
      target: { value: '  Discontinued  ' },
    });
    fireEvent.click(screen.getByTestId('deletion-request-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'PartnerRequestCatalogDeletion')?.variables).toEqual({
      input: { kind: 'PRODUCT', target_id: 'p1', mode: 'CANCEL_AND_REFUND', scheduled_for: '2026-11-15', reason: 'Discontinued' },
    });
  });

  it('keeps the dialog open and shows the server message when the request is refused', async () => {
    const { onDone, onClose } = mountDialog({ PartnerRequestCatalogDeletion: new Error('Already requested') });
    fireEvent.click(await screen.findByTestId('deletion-request-submit'));
    expect((await screen.findAllByText('Already requested')).length).toBeGreaterThanOrEqual(1);
    expect(messages()).toContain('Already requested');
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks for a day when the date is cleared, and does not send', async () => {
    const sent: SentOperation[] = [];
    mountDialog({}, sent);
    await screen.findByTestId('deletion-request-form');
    fireEvent.click(screen.getByText('clear day'));
    fireEvent.click(screen.getByTestId('deletion-request-submit'));
    expect(await screen.findByText('Pick the deletion date.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'PartnerRequestCatalogDeletion')).toBe(false);
  });

  it('refuses a day outside the allowed window', async () => {
    mountDialog();
    await screen.findByTestId('deletion-request-form');
    fireEvent.click(screen.getByText('pick outside'));
    fireEvent.click(screen.getByTestId('deletion-request-submit'));
    expect(await screen.findByText('Pick a day inside the allowed window.')).toBeTruthy();
  });

  it('cannot be dismissed while the request is being sent', async () => {
    const { onClose } = mountDialog({ PartnerRequestCatalogDeletion: STAY_PENDING });
    fireEvent.click(await screen.findByTestId('deletion-request-submit'));
    await waitFor(() => expect(screen.getByTestId('deletion-request-submit').getAttribute('disabled')).not.toBeNull());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('can be dismissed with Escape when nothing is being sent', async () => {
    const { onClose } = mountDialog();
    await screen.findByTestId('deletion-request-form');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('says how many running orders are not listed, when the list is cut short', async () => {
    mountDialog({
      PartnerCatalogDeletionPreview: preview([order()], {
        impact: { __typename: 'CatalogDeletionImpact', open_orders: 5, open_returns: 1, orders: [order()], products: [] },
      }),
    });
    expect(await screen.findByText('Showing the oldest 1 of 5 running orders.')).toBeTruthy();
    expect(screen.getByTestId('deletion-impact').textContent).toContain('5 running order(s) and 1 open return(s)');
  });

  it('says nothing is running for an item no order includes', async () => {
    mountDialog({
      PartnerCatalogDeletionPreview: preview([], {
        impact: { __typename: 'CatalogDeletionImpact', open_orders: 0, open_returns: 0, orders: [], products: [] },
      }),
    });
    expect(await screen.findByText('Nothing is running right now')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Running orders' })).toBeNull();
  });

  it('lists the products a brand deletion takes with it, marking the paused ones', async () => {
    mountDialog({
      PartnerCatalogDeletionPreview: preview([], {
        kind: 'BRAND',
        impact: {
          __typename: 'CatalogDeletionImpact',
          open_orders: 0,
          open_returns: 0,
          orders: [],
          products: [
            { __typename: 'CatalogDeletionProduct', id: 'p1', product_name: 'Chew toy', is_active: true },
            { __typename: 'CatalogDeletionProduct', id: 'p2', product_name: 'Rope', is_active: false },
          ],
        },
      }),
    });
    const list = within(await screen.findByRole('list', { name: 'Products deleted with this brand (2)' }));
    expect(list.getByText('Chew toy')).toBeTruthy();
    expect(list.getByText('Rope')).toBeTruthy();
    expect(list.getAllByText('Paused')).toHaveLength(1);
    expect(screen.getByText(/Deleting a brand deletes all of its products too/)).toBeTruthy();
  });

  it('lists no products for a brand that has none yet', async () => {
    mountDialog({
      PartnerCatalogDeletionPreview: preview([], {
        kind: 'BRAND',
        impact: { __typename: 'CatalogDeletionImpact', open_orders: 0, open_returns: 0, orders: [], products: [] },
      }),
    });
    expect(await screen.findByText(/Deleting a brand deletes all of its products too/)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('says what could not be loaded and tries again on Retry', async () => {
    const sent: SentOperation[] = [];
    mountDialog({ PartnerCatalogDeletionPreview: new Error('Preview is down') }, sent);
    expect(await screen.findByText('Preview is down')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    await waitFor(() => expect(sent.filter((op) => op.name === 'PartnerCatalogDeletionPreview').length).toBeGreaterThan(1));
  });

  it('says the impact is unavailable when the answer carries none', async () => {
    mountDialog({ PartnerCatalogDeletionPreview: { catalogDeletionPreview: null } });
    expect(await screen.findByText('We could not load what this deletion would affect. Try again.')).toBeTruthy();
  });
});

describe('WithdrawDeletionDialog', () => {
  const withdrawTarget = { request: requestRow() as never, name: 'Chew toy' };
  const mountWithdraw = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<WithdrawDeletionDialog target={withdrawTarget} onClose={onClose} onDone={onDone} />, {
      link: scriptedLink(answers, sent),
    });
    return { onDone, onClose };
  };

  it('withdraws the request, says the item is back on sale and closes', async () => {
    const sent: SentOperation[] = [];
    const { onDone, onClose } = mountWithdraw(
      { PartnerWithdrawCatalogDeletion: { withdrawCatalogDeletion: requestRow({ status: 'WITHDRAWN' }) } },
      sent,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw deletion request' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'PartnerWithdrawCatalogDeletion')?.variables).toEqual({ id: 'r1' });
    expect(messages()).toContain('Deletion request withdrawn — Chew toy is back on sale.');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports a refused withdrawal and closes without announcing success', async () => {
    const { onDone, onClose } = mountWithdraw({ PartnerWithdrawCatalogDeletion: new Error('Deletion already started') });
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw deletion request' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(messages()).toContain('Deletion already started');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('does nothing when it is confirmed with no request selected', async () => {
    const sent: SentOperation[] = [];
    const onClose = vi.fn();
    const onDone = vi.fn();
    const rendered = renderWithProviders(<WithdrawDeletionDialog target={withdrawTarget} onClose={onClose} onDone={onDone} />, {
      link: scriptedLink({}, sent),
    });
    const confirm = await screen.findByRole('button', { name: 'Withdraw deletion request' });
    rendered.rerenderWith(<WithdrawDeletionDialog target={null} onClose={onClose} onDone={onDone} />);
    // Still on screen while the dialog fades out — a late click must not withdraw anything.
    fireEvent.click(confirm);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sent.some((op) => op.name === 'PartnerWithdrawCatalogDeletion')).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
  });
});

/** What the hook finds for a product p1, a brand b1, and a product with no id. */
function Probe({ brandId = 'b1' }: Readonly<{ brandId?: string | null }>) {
  const { openFor, reload } = useDeletionRequests(brandId);
  const found = [openFor('PRODUCT', 'p1'), openFor('BRAND', 'b1'), openFor('PRODUCT', '')].map((request) => request?.id ?? 'none');
  return (
    <>
      <output data-testid="found">{found.join('|')}</output>
      <button type="button" onClick={reload}>
        reload
      </button>
    </>
  );
}

describe('useDeletionRequests', () => {
  const mountProbe = (rows: unknown[] | Error) =>
    renderWithProviders(<Probe />, {
      link: scriptedLink({
        PartnerMyCatalogDeletionRequests: rows instanceof Error ? rows : { myCatalogDeletionRequests: rows },
      }),
    });

  it('finds an open request by the brand or product it is for', async () => {
    mountProbe([requestRow(), requestRow({ id: 'r2', kind: 'BRAND', product_id: null, brand_id: 'b1' })]);
    await waitFor(() => expect(screen.getByTestId('found').textContent).toBe('r1|r2|none'));
  });

  it('files a product request that names no product under the empty id', async () => {
    mountProbe([requestRow({ id: 'r3', product_id: null })]);
    await waitFor(() => expect(screen.getByTestId('found').textContent).toBe('none|none|r3'));
  });

  it('ignores a request that is no longer open', async () => {
    mountProbe([requestRow({ status: 'WITHDRAWN' })]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByTestId('found').textContent).toBe('none|none|none');
  });

  it('reports a failure to read the requests', async () => {
    mountProbe(new Error('Requests are down'));
    await waitFor(() => expect(messages()).toContain('Requests are down'));
  });

  it('asks for every brand’s requests when no brand is given', async () => {
    const sent: SentOperation[] = [];
    renderWithProviders(<Probe brandId={null} />, {
      link: scriptedLink({ PartnerMyCatalogDeletionRequests: { myCatalogDeletionRequests: [] } }, sent),
    });
    await waitFor(() => expect(sent.some((op) => op.name === 'PartnerMyCatalogDeletionRequests')).toBe(true));
    expect(sent.find((op) => op.name === 'PartnerMyCatalogDeletionRequests')?.variables).toEqual({ brand_id: null });
  });

  it('reports a failed reload and keeps the requests it already had', async () => {
    let reads = 0;
    renderWithProviders(<Probe />, {
      link: scriptedLink({
        PartnerMyCatalogDeletionRequests: () => {
          reads += 1;
          return reads === 1 ? { myCatalogDeletionRequests: [requestRow()] } : new Error('Reload failed');
        },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('found').textContent).toBe('r1|none|none'));
    fireEvent.click(screen.getByRole('button', { name: 'reload' }));
    await waitFor(() => expect(messages()).toContain('Reload failed'));
    expect(screen.getByTestId('found').textContent).toBe('r1|none|none');
  });
});
