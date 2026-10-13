import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import IntegrationsPage from './IntegrationsPage';
import { connection, mountIntegrations } from './__tests__/harness';
import { recordNotices } from '../../../__tests__/groupC-notices';
import type { ScriptedAnswer, SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const mount = (list: ScriptedAnswer, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  mountIntegrations(<IntegrationsPage />, { MyPartnerIntegrations: list, ...answers }, sent);

const main = connection('c1', 'RAZORPAY', 'Main Razorpay', { brands: [{ __typename: 'EcommBrand', id: 'b1', brand_name: 'Aurora Pets' }] });
const spare = connection('c2', 'RAZORPAY', 'Spare keys', { identifier: 'rzp_test_spare' });
const ship = connection('c3', 'SHIPROCKET', 'Warehouse account', { identifier: 'ops@brand.example.com' });

describe('IntegrationsPage list', () => {
  it('shows a loading state, then each provider with its saved accounts', async () => {
    mount({ myPartnerIntegrations: [main, ship] });
    expect(screen.getByRole('status', { name: 'Loading your integrations' })).toBeTruthy();
    const razorpay = within(await screen.findByTestId('integrations-razorpay'));
    expect(razorpay.getByText('Main Razorpay')).toBeTruthy();
    expect(razorpay.getByText('Used by Aurora Pets')).toBeTruthy();
    expect(within(screen.getByTestId('integrations-shiprocket')).getByText('Warehouse account')).toBeTruthy();
  });

  it('says a provider has no saved account yet', async () => {
    mount({ myPartnerIntegrations: [ship] });
    expect(await screen.findByText('No Razorpay account saved yet.')).toBeTruthy();
  });

  it('shows a load failure and reloads on Try again', async () => {
    const sent: SentOperation[] = [];
    mount(new Error('Integrations are down'), {}, sent);
    expect(await screen.findByText(/Integrations are down/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyPartnerIntegrations').length).toBeGreaterThan(1));
  });

  it('shows why a connection that failed its check is not usable', async () => {
    const failing = connection('c4', 'RAZORPAY', 'Old keys', { connected: false, message: 'Key was revoked', details: ['Check the dashboard'] });
    mount({ myPartnerIntegrations: [failing] });
    const row = within(await screen.findByTestId('connection-row-c4'));
    expect(row.getByText('Key was revoked')).toBeTruthy();
    expect(row.getByText('Check the dashboard')).toBeTruthy();
    expect(row.getByTestId('integration-chip-state').textContent).toBe('Not connected');
  });
});

describe('IntegrationsPage connection actions', () => {
  it('will not delete a connection a brand uses', async () => {
    mount({ myPartnerIntegrations: [main] });
    const del = await screen.findByTestId('connection-row-c1-delete');
    expect((del as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/A connection in use cannot be deleted/)).toBeTruthy();
  });

  it('deletes an unused connection after a confirmation', async () => {
    const sent: SentOperation[] = [];
    mount({ myPartnerIntegrations: [spare] }, { DeletePartnerIntegration: { deletePartnerIntegration: true } }, sent);
    fireEvent.click(await screen.findByTestId('connection-row-c2-delete'));
    expect(await screen.findByText('Delete Spare keys?')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Connection deleted'));
    expect(sent.find((op) => op.name === 'DeletePartnerIntegration')?.variables).toEqual({ id: 'c2' });
  });

  it('reports a refused deletion', async () => {
    mount({ myPartnerIntegrations: [spare] }, { DeletePartnerIntegration: new Error('Still referenced') });
    fireEvent.click(await screen.findByTestId('connection-row-c2-delete'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Still referenced'));
  });

  it('re-checks a connection against the vendor', async () => {
    const sent: SentOperation[] = [];
    mount({ myPartnerIntegrations: [spare] }, { RecheckPartnerIntegration: { recheckPartnerIntegration: spare } }, sent);
    const row = within(await screen.findByTestId('connection-row-c2'));
    fireEvent.click(row.getByRole('button', { name: 'Test again' }));
    await waitFor(() => expect(sent.some((op) => op.name === 'RecheckPartnerIntegration')).toBe(true));
    expect(sent.find((op) => op.name === 'RecheckPartnerIntegration')?.variables).toEqual({ id: 'c2' });
  });

  it('reports a failed re-check', async () => {
    mount({ myPartnerIntegrations: [spare] }, { RecheckPartnerIntegration: new Error('Vendor unreachable') });
    fireEvent.click(within(await screen.findByTestId('connection-row-c2')).getByRole('button', { name: 'Test again' }));
    await waitFor(() => expect(messages()).toContain('Vendor unreachable'));
  });
});
