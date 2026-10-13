import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import IntegrationPicker from './IntegrationPicker';
import ShippingModeChooser from './ShippingModeChooser';
import { connection, integrationStatus, mountIntegrations } from '../../integrations/__tests__/harness';
import { recordNotices } from '../../../../__tests__/groupC-notices';
import type { BrandIntegrationStatus } from '../../queries';
import type { PartnerIntegration } from '../../integrations/integrations.queries';
import type { ScriptedAnswer, SentOperation } from '../../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const saved = [connection('c1', 'RAZORPAY', 'Main Razorpay'), connection('c2', 'RAZORPAY', 'Backup keys', { identifier: 'rzp_test_backup' })];

const mountPicker = (
  props: { status?: Partial<BrandIntegrationStatus>; connections?: PartnerIntegration[] | undefined; locked?: boolean; ensure?: () => Promise<string | null> },
  answers: Record<string, ScriptedAnswer> = {},
  sent: SentOperation[] = [],
) => {
  const onChanged = vi.fn();
  mountIntegrations(
    <IntegrationPicker
      provider="RAZORPAY"
      status={props.status ? (integrationStatus('RAZORPAY', props.status) as unknown as BrandIntegrationStatus) : undefined}
      connections={'connections' in props ? props.connections : (saved as unknown as PartnerIntegration[])}
      locked={props.locked ?? false}
      ensureBrandId={props.ensure ?? (async () => 'b1')}
      onChanged={onChanged}
    />,
    { MyPartnerIntegrations: { myPartnerIntegrations: [] }, ...answers },
    sent,
  );
  return onChanged;
};

describe('IntegrationPicker states', () => {
  it('says Not set up and offers no account list while connections are still loading', () => {
    mountPicker({ connections: undefined });
    expect(screen.getByTestId('integration-chip-state').textContent).toBe('Not set up');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/You have not saved a Razorpay account yet/)).toBeNull();
  });

  it('shows the vendor result when the brand’s copy of the account fails its check', () => {
    mountPicker({ status: { connected: false, message: 'Key revoked', details: ['Re-generate the key'] } });
    expect(screen.getByTestId('integration-result').textContent).toContain('Key revoked');
    expect(screen.getByTestId('integration-chip-state').textContent).toBe('Not connected');
  });

  it('shows live mode and the last check time on a connected Razorpay account', () => {
    mountPicker({ status: { live_mode: true, checked_at: '2026-07-01T10:00:00.000Z' } });
    expect(screen.getByTestId('integration-chip-mode').textContent).toBe('Live mode — real money');
    expect(screen.getByText(/^Checked /)).toBeTruthy();
  });

  it('hides every control on a locked brand', () => {
    mountPicker({ status: { connected: true }, locked: true });
    expect(screen.queryByRole('button', { name: 'Add connection' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove from brand' })).toBeNull();
    expect((screen.getByRole('combobox') as HTMLElement).getAttribute('aria-disabled')).toBe('true');
  });
});

describe('IntegrationPicker disconnect', () => {
  it('removes the account from the brand after a confirmation', async () => {
    const sent: SentOperation[] = [];
    const onChanged = mountPicker(
      { status: { connected: true, connection_id: 'c1' } },
      { DisconnectBrandIntegration: { disconnectBrandIntegration: integrationStatus('RAZORPAY', { configured: false, connected: false }) } },
      sent,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove from brand' }));
    expect(await screen.findByText('Remove Razorpay from this brand?')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove from brand' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'DisconnectBrandIntegration')?.variables).toEqual({ brand_doc_id: 'b1', provider: 'RAZORPAY' });
    expect(messages()).toContain('Removed from this brand. Pick an account again to keep it live.');
  });

  it('reports a refused removal and closes the confirmation', async () => {
    const onChanged = mountPicker({ status: { connected: true } }, { DisconnectBrandIntegration: new Error('Brand is live') });
    fireEvent.click(screen.getByRole('button', { name: 'Remove from brand' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove from brand' }));
    await waitFor(() => expect(messages()).toContain('Brand is live'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('does nothing when the brand could not be saved first', async () => {
    const sent: SentOperation[] = [];
    mountPicker({ status: { connected: true }, ensure: async () => null }, {}, sent);
    fireEvent.click(screen.getByRole('button', { name: 'Remove from brand' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove from brand' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent.some((op) => op.name === 'DisconnectBrandIntegration')).toBe(false);
  });
});

describe('IntegrationPicker add and pick', () => {
  it('adds an account in the dialog and picks it straight away when its check passed', async () => {
    const sent: SentOperation[] = [];
    const created = connection('c9', 'RAZORPAY', 'Fresh keys');
    const onChanged = mountPicker(
      { connections: [] },
      {
        SavePartnerIntegration: { savePartnerIntegration: created },
        UseBrandIntegration: { useBrandIntegration: integrationStatus('RAZORPAY', { connection_id: 'c9' }) },
      },
      sent,
    );
    expect(screen.getByText(/You have not saved a Razorpay account yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    await screen.findByTestId('connection-form-razorpay');
    fireEvent.change(screen.getByTestId('connection-razorpay-label').querySelector('input') as HTMLInputElement, { target: { value: 'Fresh keys' } });
    fireEvent.change(screen.getByTestId('integration-razorpay-key_id').querySelector('input') as HTMLInputElement, { target: { value: 'rzp_test_new' } });
    fireEvent.change(screen.getByTestId('integration-razorpay-key_secret').querySelector('input') as HTMLInputElement, { target: { value: 'sek' } });
    fireEvent.click(screen.getByTestId('connection-razorpay-save'));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'UseBrandIntegration')?.variables).toEqual({
      brand_doc_id: 'b1',
      provider: 'RAZORPAY',
      integration_id: 'c9',
    });
  });

  it('reports a pick the server refuses', async () => {
    const onChanged = mountPicker({ status: { connection_id: 'c1' } }, { UseBrandIntegration: new Error('Account belongs to another partner') });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Backup keys — rzp_test_backup' }));
    await waitFor(() => expect(messages()).toContain('Account belongs to another partner'));
    expect(onChanged).not.toHaveBeenCalled();
  });
});

const radio = (testId: string) => screen.getByTestId(testId).querySelector('input') as HTMLInputElement;

describe('ShippingModeChooser', () => {
  const mountChooser = (mode: 'OWN_SHIPROCKET' | 'DUNCIT_COURIER' | null, locked = false, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
    const onChanged = vi.fn();
    mountIntegrations(<ShippingModeChooser mode={mode} locked={locked} ensureBrandId={async () => 'b1'} onChanged={onChanged} />, answers, sent);
    return onChanged;
  };

  it('saves the picked mode and reloads', async () => {
    const sent: SentOperation[] = [];
    const onChanged = mountChooser(
      'OWN_SHIPROCKET',
      false,
      { SetBrandShippingMode: { setBrandShippingMode: { __typename: 'EcommBrand', id: 'b1', shipping_mode: 'DUNCIT_COURIER' } } },
      sent,
    );
    expect(radio('brand-shipping-mode-own').checked).toBe(true);
    fireEvent.click(radio('brand-shipping-mode-duncit'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'SetBrandShippingMode')?.variables).toEqual({ brand_doc_id: 'b1', mode: 'DUNCIT_COURIER' });
    expect(messages()).toContain('Shipping choice saved');
  });

  it('reports a refused change', async () => {
    const onChanged = mountChooser(null, false, { SetBrandShippingMode: new Error('Switch not allowed') });
    fireEvent.click(radio('brand-shipping-mode-own'));
    await waitFor(() => expect(messages()).toContain('Switch not allowed'));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('is read-only while the brand is locked', () => {
    mountChooser('DUNCIT_COURIER', true);
    expect(radio('brand-shipping-mode-own').disabled).toBe(true);
  });
});
