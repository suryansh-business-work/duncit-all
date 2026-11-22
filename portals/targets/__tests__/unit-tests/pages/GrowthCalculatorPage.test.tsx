/**
 * The Growth Calculator page end to end against a schema-shaped Apollo mock:
 * the default plan's figures, instant recalculation, saving (once, even on a
 * retry), editing with the conflict guard, and the saved list's View, Edit,
 * Duplicate and Delete.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { ConfirmProvider } from '@duncit/dialogs';
import GrowthCalculatorPage from '../../../src/pages/growth/GrowthCalculatorPage';
import { DEFAULT_GROWTH_INPUTS } from '../../../src/lib/growth-calculator';
import {
  DELETE_GROWTH_CALCULATION,
  DUPLICATE_GROWTH_CALCULATION,
  SAVE_GROWTH_CALCULATION,
  UPDATE_GROWTH_CALCULATION,
} from '../../../src/lib/queries';
import { savedCalculation } from '../../fixtures';
import { tableControls } from '../../mocks/table';

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
  notifyError,
}));
vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { full_name: 'Asha Planner', email: 'asha@example.com' } }),
}));

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
  let n = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    n += 1;
    return `req-${n}` as ReturnType<typeof crypto.randomUUID>;
  });
});

function renderPage(mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks}>
      <ConfirmProvider>
        <GrowthCalculatorPage />
      </ConfirmProvider>
    </MockedProvider>
  );
}

const kpi = (id: string) => screen.getByTestId(`growth-kpi-${id}`);
const inputBox = (key: string) => screen.getByTestId(`growth-input-${key}`) as HTMLInputElement;
const setInput = (key: string, value: string) => fireEvent.change(inputBox(key), { target: { value } });
const titleBox = () => screen.getByTestId('save-calculation-title') as HTMLInputElement;

const saveMock = (title: string, requestId: string, result: MockedResponse['result'] | null, error?: Error): MockedResponse => ({
  request: {
    query: SAVE_GROWTH_CALCULATION,
    variables: { input: { title, description: '', inputs: DEFAULT_GROWTH_INPUTS, client_request_id: requestId } },
  },
  ...(error ? { error } : { result: result ?? { data: { saveGrowthCalculation: savedCalculation({ title }) } } }),
});

async function openMenu(rowIndex: number, item: string) {
  const row = (await screen.findAllByTestId('table-row'))[rowIndex];
  fireEvent.click(within(row).getByTestId('row-actions-menu'));
  const entry = await screen.findByTestId(`row-actions-menu-${item}`);
  return entry;
}

describe('the default plan', () => {
  it('shows the verification figures on the tiles, the breakdown and the charts', async () => {
    renderPage();
    await waitFor(() => expect(kpi('monthly-gmv')).toHaveTextContent('₹1,60,00,000'));
    expect(kpi('pod-value')).toHaveTextContent('₹4,000');
    expect(kpi('pod-value')).toHaveTextContent('₹800');
    expect(kpi('monthly-earnings')).toHaveTextContent('₹32,00,000');
    expect(kpi('annual-earnings')).toHaveTextContent('₹3,84,00,000');
    expect(kpi('monthly-pods')).toHaveTextContent('4,000');
    expect(kpi('partners')).toHaveTextContent('1,000 venues · 2,000 hosts');
    expect(kpi('total-leads')).toHaveTextContent('40,000');
    expect(kpi('total-leads')).toHaveTextContent('20,000 host · 20,000 venue');
    expect(screen.getByTestId('growth-breakdown-city-earnings')).toHaveTextContent('₹3,20,000');
    expect(screen.getByTestId('growth-breakdown-city-pods')).toHaveTextContent('400');
    expect(screen.getByText(/before operational expenses\. They are not final net profit/)).toBeInTheDocument();
    expect(screen.getByTestId('growth-formulas')).toHaveTextContent('Monthly pods per city = venues × hosts per venue × pods per host per month');
  });

  it('feeds the charts cumulative rupees and leads against partners, with formatted tooltips and ticks', async () => {
    const { charts } = await import('../../mocks/charts');
    renderPage();
    await waitFor(() => expect(charts.line).not.toBeNull());
    const [gmv, earnings] = charts.line!.data.datasets;
    expect(gmv.data[0]).toBe(16_000_000);
    expect(gmv.data[11]).toBe(192_000_000);
    expect(earnings.data[11]).toBe(38_400_000);
    expect(charts.line!.data.labels).toHaveLength(12);
    expect(charts.line!.options.plugins.tooltip.callbacks.label({ dataset: { label: 'GMV' }, parsed: { y: 16_000_000 } })).toMatch(
      /^GMV: ₹1\.6\s?Cr$/
    );
    expect(charts.line!.options.scales.y.ticks.callback(320_000)).toMatch(/^₹3\.2\s?L$/);

    expect(charts.bar!.data.datasets.map((d) => d.data)).toEqual([
      [20000, 20000],
      [2000, 1000],
    ]);
    expect(charts.bar!.options.plugins.tooltip.callbacks.label({ dataset: { label: 'Leads needed' }, parsed: { y: 20000 } })).toBe(
      'Leads needed: 20,000'
    );
  });
});

describe('recalculating', () => {
  it('updates every figure as an assumption changes', async () => {
    renderPage();
    setInput('target_cities', '20');
    await waitFor(() => expect(kpi('monthly-gmv')).toHaveTextContent('₹3,20,00,000'));
    expect(kpi('total-leads')).toHaveTextContent('80,000');
  });

  it('holds the last valid figures, says why, and blocks saving while a box is wrong', async () => {
    renderPage();
    setInput('venue_conversion_pct', '0');
    expect(await screen.findByTestId('growth-results-stale')).toBeInTheDocument();
    expect(kpi('monthly-gmv')).toHaveTextContent('₹1,60,00,000');
    expect(screen.getByTestId('save-calculation-submit')).toBeDisabled();
  });

  it('goes back to the defaults on Reset', async () => {
    renderPage();
    setInput('pax_per_pod', '20');
    await waitFor(() => expect(kpi('pod-value')).toHaveTextContent('₹8,000'));
    fireEvent.click(screen.getByTestId('growth-inputs-reset'));
    await waitFor(() => expect(kpi('pod-value')).toHaveTextContent('₹4,000'));
  });
});

describe('saving', () => {
  it('saves the current plan with a request id, confirms it and refreshes the list', async () => {
    renderPage([saveMock('Ten cities', 'req-1', null)]);
    await waitFor(() => expect(tableControls.fetches).toBe(1));
    expect((screen.getByTestId('save-calculation-by') as HTMLInputElement).value).toBe('Asha Planner');
    fireEvent.change(titleBox(), { target: { value: 'Ten cities' } });
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation saved'));
    expect(tableControls.fetches).toBe(2);
    await waitFor(() => expect(titleBox().value).toBe(''));
  });

  // Both mocks answer only `client_request_id: 'req-1'`: a retry that minted a
  // fresh id would match neither, fail a second time and never confirm.
  it('retries a failed save with the same request id, so the server can never write it twice', async () => {
    renderPage([saveMock('Retry', 'req-1', null, new Error('Failed to fetch')), saveMock('Retry', 'req-1', null)]);
    fireEvent.change(titleBox(), { target: { value: 'Retry' } });
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The calculation could not be saved. Try again.'));
    expect(titleBox().value).toBe('Retry');
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation saved'));
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});

describe('the saved list', () => {
  const mine = savedCalculation({ id: 'calc-mine', title: 'Metro push', description: 'Mumbai and Delhi', revision: 2 });
  const theirs = savedCalculation({
    id: 'calc-theirs',
    title: 'Tier two',
    can_edit: false,
    inputs: { target_cities: 3 },
    calculated_by: { __typename: 'GrowthActor', user_id: 'u-ravi', name: 'Ravi', email: null, roles: ['TARGETS_MANAGER'] } as never,
  });

  beforeEach(() => {
    tableControls.rows = [mine, theirs];
  });

  it('shows every column formatted', async () => {
    renderPage();
    const [first, second] = await screen.findAllByTestId('table-row');
    expect(within(first).getByTestId('cell-title')).toHaveTextContent('Metro push');
    expect(within(first).getByTestId('cell-description')).toHaveTextContent('Mumbai and Delhi');
    expect(within(first).getByTestId('cell-calculated_by_name')).toHaveTextContent('Asha Planner');
    expect(within(first).getByTestId('cell-monthly_gmv')).toHaveTextContent('₹1,60,00,000');
    expect(within(first).getByTestId('cell-monthly_earnings')).toHaveTextContent('₹32,00,000');
    expect(within(first).getByTestId('cell-host_leads')).toHaveTextContent('20,000');
    expect(within(second).getByTestId('cell-cities')).toHaveTextContent('3');
    expect(within(second).getByTestId('cell-venues')).toHaveTextContent('300');
  });

  it('offers Edit and Delete only on rows the server says the reader may change', async () => {
    renderPage();
    expect(await openMenu(1, 'edit')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('row-actions-menu-delete')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('row-actions-menu-duplicate')).not.toHaveAttribute('aria-disabled');
  });

  it('opens the full details on View and on a row click', async () => {
    renderPage();
    fireEvent.click(await openMenu(0, 'view'));
    const dialog = await screen.findByTestId('growth-detail');
    expect(within(dialog).getByTestId('growth-detail-by')).toHaveTextContent('Asha Planner');
    expect(within(dialog).getByTestId('growth-detail-email')).toHaveTextContent('asha@example.com');
    expect(within(dialog).getByTestId('growth-detail-roles')).toHaveTextContent('TARGETS_MANAGER');
    expect(within(dialog).getByTestId('growth-detail-input-price_per_pax')).toHaveTextContent('400');
    expect(within(dialog).getByTestId('growth-breakdown-total-annual-earnings')).toHaveTextContent('₹3,84,00,000');
    expect(within(dialog).getByTestId('growth-formulas')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('growth-detail-close'));
    await waitFor(() => expect(screen.queryByTestId('growth-detail')).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByTestId('row-open')[1]);
    expect(await screen.findByTestId('growth-detail-email')).toHaveTextContent('—');
  });

  it('edits a record against its revision and confirms the update', async () => {
    const edited = { ...mine, title: 'Metro push v2', revision: 3, totals: { ...mine.totals } };
    renderPage([
      {
        request: {
          query: UPDATE_GROWTH_CALCULATION,
          variables: {
            id: 'calc-mine',
            input: { title: 'Metro push v2', description: 'Mumbai and Delhi', inputs: DEFAULT_GROWTH_INPUTS, expected_revision: 2 },
          },
        },
        result: { data: { updateGrowthCalculation: edited } },
      },
    ]);
    fireEvent.click(await openMenu(0, 'edit'));
    await waitFor(() => expect(titleBox().value).toBe('Metro push'));
    fireEvent.change(titleBox(), { target: { value: 'Metro push v2' } });
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation updated'));
    await waitFor(() => expect(screen.queryByTestId('save-calculation-cancel')).not.toBeInTheDocument());
  });

  it('says so when someone else edited the record first', async () => {
    renderPage([
      {
        request: {
          query: UPDATE_GROWTH_CALCULATION,
          variables: {
            id: 'calc-mine',
            input: { title: 'Metro push', description: 'Mumbai and Delhi', inputs: DEFAULT_GROWTH_INPUTS, expected_revision: 2 },
          },
        },
        result: { errors: [new GraphQLError('changed', { extensions: { code: 'CONFLICT' } })] },
      },
    ]);
    fireEvent.click(await openMenu(0, 'edit'));
    await waitFor(() => expect(titleBox().value).toBe('Metro push'));
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'Someone else changed this calculation since you opened it. Open it again to see their changes.'
      )
    );
    expect(screen.getByTestId('save-calculation-cancel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('save-calculation-cancel'));
    await waitFor(() => expect(titleBox().value).toBe(''));
  });

  it('duplicates a row under a copy title', async () => {
    renderPage([
      {
        request: { query: DUPLICATE_GROWTH_CALCULATION, variables: { id: 'calc-theirs', title: 'Tier two (copy)', clientRequestId: 'req-1' } },
        result: { data: { duplicateGrowthCalculation: { __typename: 'GrowthCalculation', id: 'calc-new' } } },
      },
    ]);
    await waitFor(() => expect(tableControls.fetches).toBe(1));
    fireEvent.click(await openMenu(1, 'duplicate'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation duplicated'));
    expect(tableControls.fetches).toBe(2);
  });

  it('reports a failed duplicate', async () => {
    renderPage([
      {
        request: { query: DUPLICATE_GROWTH_CALCULATION, variables: { id: 'calc-mine', title: 'Metro push (copy)', clientRequestId: 'req-1' } },
        error: new Error('boom'),
      },
    ]);
    fireEvent.click(await openMenu(0, 'duplicate'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That did not work. Try again.'));
  });

  it('deletes only after confirming, and does nothing when cancelled', async () => {
    renderPage([
      {
        request: { query: DELETE_GROWTH_CALCULATION, variables: { id: 'calc-mine' } },
        result: { data: { deleteGrowthCalculation: true } },
      },
    ]);
    fireEvent.click(await openMenu(0, 'delete'));
    expect(await screen.findByTestId('confirm-dialog-message')).toHaveTextContent('"Metro push" will be removed');
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();

    fireEvent.click(await openMenu(0, 'delete'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Calculation deleted'));
  });

  it('reports a delete the server refused', async () => {
    renderPage([
      {
        request: { query: DELETE_GROWTH_CALCULATION, variables: { id: 'calc-mine' } },
        result: { errors: [new GraphQLError('no', { extensions: { code: 'FORBIDDEN' } })] },
      },
    ]);
    fireEvent.click(await openMenu(0, 'delete'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That did not work. Try again.'));
  });
});
