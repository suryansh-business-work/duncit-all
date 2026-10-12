import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import BrandConsentPanel from '../../src/pages/ecomm/brand-review-detail/BrandConsentPanel';
import BrandIntegrationCard from '../../src/pages/ecomm/brand-review-detail/BrandIntegrationCard';
import BrandIntegrationsPanel from '../../src/pages/ecomm/brand-review-detail/BrandIntegrationsPanel';
import BrandStatusPanel from '../../src/pages/ecomm/brand-review-detail/BrandStatusPanel';
import BrandSubmissionSection from '../../src/pages/ecomm/brand-review-detail/BrandSubmissionSection';
import BrandWizardSteps from '../../src/pages/ecomm/brand-review-detail/BrandWizardSteps';
import type { BrandConsent, BrandIntegrationStatus } from '../../src/pages/ecomm/queries';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

const m = vi.hoisted(() => ({
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  loading: {} as Record<string, boolean>,
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useMutation: (doc: { definitions: { name: { value: string } }[] }) => {
    const name = doc.definitions[0].name.value;
    return [m.mutations[name], { loading: m.loading[name] ?? false }];
  },
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (v: string) => `DT:${v}` }),
}));

const status = (over: Partial<BrandIntegrationStatus> = {}): BrandIntegrationStatus => ({
  provider: 'SHIPROCKET',
  configured: true,
  connected: true,
  checked_at: null,
  message: '',
  details: [],
  identifier: 'ship@acme.com',
  has_secret: true,
  pickup_location: 'Warehouse 1',
  live_mode: false,
  has_webhook_secret: false,
  sandbox: false,
  ...over,
});

const consent = (over: Partial<BrandConsent> = {}): BrandConsent => ({
  accepted: true,
  signed_name: 'Asha',
  signed_at: '2026-10-01T10:00:00.000Z',
  policy_slug: 'brand-consent',
  policy_title: 'Brand Consent v3',
  content_hash: 'abc123',
  current: true,
  available: true,
  ...over,
});

beforeEach(() => {
  m.mutations = {
    ReviewBrandIntegration: vi.fn(),
    SetBrandShiprocketSandbox: vi.fn(),
    SetEcommBrandActive: vi.fn().mockResolvedValue({}),
    AdminDeleteEcommBrand: vi.fn().mockResolvedValue({}),
  };
  m.loading = {};
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('BrandConsentPanel', () => {
  it('says nothing can be signed until Legal publishes a consent', () => {
    render(<BrandConsentPanel consent={consent({ available: false, accepted: false, content_hash: '' })} />);
    expect(screen.getByText('Legal has not published a Brand Consent yet.')).toBeInTheDocument();
    expect(screen.queryByText('Wording hash')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand Consent v3')).not.toBeInTheDocument();
  });

  it('warns when unsigned', () => {
    render(<BrandConsentPanel consent={consent({ accepted: false, current: false })} />);
    expect(screen.getByText('Not signed')).toBeInTheDocument();
    expect(screen.getByText('Brand Consent v3')).toBeInTheDocument();
  });

  it('flags a signature against older wording and still shows who signed', () => {
    render(<BrandConsentPanel consent={consent({ current: false })} />);
    expect(screen.getByText(/Signed against an older wording/)).toBeInTheDocument();
    expect(screen.getByText('Signed by Asha on DT:2026-10-01T10:00:00.000Z')).toBeInTheDocument();
  });

  it('shows the signed line once and the wording hash when current', () => {
    render(<BrandConsentPanel consent={consent()} />);
    expect(screen.getAllByText('Signed by Asha on DT:2026-10-01T10:00:00.000Z')).toHaveLength(1);
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('uses a dash for a missing signing time and policy title', () => {
    render(<BrandConsentPanel consent={consent({ signed_at: null, policy_title: '' })} />);
    expect(screen.getByText('Signed by Asha on —')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('BrandIntegrationCard', () => {
  const card = (s: BrandIntegrationStatus, extra: { footer?: React.ReactNode; checking?: boolean } = {}) => {
    const onCheck = vi.fn();
    render(<BrandIntegrationCard title="ShipRocket" status={s} checking={extra.checking ?? false} onCheck={onCheck} footer={extra.footer} />);
    return onCheck;
  };

  it('shows a connected account with its pickup nickname and re-checks on demand', () => {
    const onCheck = card(status());
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('ship@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('brand-integration-check-shiprocket'));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it('shows not set up with dashes and nothing to say', () => {
    card(status({ configured: false, connected: false, identifier: '', pickup_location: '' }));
    expect(screen.getByText('Not set up')).toBeInTheDocument();
    expect(screen.queryByText(/Checked/)).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows a refused account with the vendor message, details and check time', () => {
    card(status({ connected: false, checked_at: '2026-10-02', message: 'Bad credentials', details: ['Token expired', 'Retry later'] }));
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText('Checked DT:2026-10-02')).toBeInTheDocument();
    expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Token expired', 'Retry later']);
  });

  it('prefers the sandbox user in sandbox mode, and falls back to the live user without one', () => {
    const { unmount } = render(
      <BrandIntegrationCard
        title="ShipRocket"
        status={status({ sandbox: true, sandbox_identifier: 'sandbox@acme.com' })}
        checking={false}
        onCheck={vi.fn()}
      />,
    );
    expect(screen.getByText('sandbox@acme.com')).toBeInTheDocument();
    expect(screen.getByTestId('brand-integration-sandbox-chip')).toBeInTheDocument();
    unmount();
    card(status({ sandbox: true, sandbox_identifier: '' }));
    expect(screen.getByText('ship@acme.com')).toBeInTheDocument();
  });

  it('shows the Razorpay mode chip only for a configured Razorpay account and no pickup row', () => {
    const { unmount } = render(
      <BrandIntegrationCard
        title="Razorpay"
        status={status({ provider: 'RAZORPAY', live_mode: true, pickup_location: '' })}
        checking={false}
        onCheck={vi.fn()}
      />,
    );
    expect(screen.getByText('Live mode')).toBeInTheDocument();
    expect(screen.queryByText('Default pickup')).not.toBeInTheDocument();
    unmount();
    const second = render(
      <BrandIntegrationCard title="Razorpay" status={status({ provider: 'RAZORPAY', live_mode: false })} checking={false} onCheck={vi.fn()} />,
    );
    expect(screen.getByText('Test mode')).toBeInTheDocument();
    second.unmount();
    render(
      <BrandIntegrationCard
        title="Razorpay"
        status={status({ provider: 'RAZORPAY', configured: false, connected: false })}
        checking={false}
        onCheck={vi.fn()}
      />,
    );
    expect(screen.queryByText('Test mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Live mode')).not.toBeInTheDocument();
  });

  it('renders a footer under the check button', () => {
    card(status(), { footer: <p>FOOTER</p> });
    expect(screen.getByText('FOOTER')).toBeInTheDocument();
  });
});

describe('BrandIntegrationsPanel', () => {
  const integrations = (ship: Partial<BrandIntegrationStatus> = {}, razor: Partial<BrandIntegrationStatus> = {}) => ({
    shiprocket: status(ship),
    razorpay: status({ provider: 'RAZORPAY', identifier: 'rzp_test_1', ...razor }),
  });

  it('swaps in the vendor answer after a re-check', async () => {
    m.mutations.ReviewBrandIntegration.mockResolvedValue({
      data: { reviewBrandIntegration: status({ provider: 'RAZORPAY', identifier: 'rzp_live_9' }) },
    });
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations()} />);
    fireEvent.click(screen.getByTestId('brand-integration-check-razorpay'));
    expect(await screen.findByText('rzp_live_9')).toBeInTheDocument();
    expect(m.mutations.ReviewBrandIntegration).toHaveBeenCalledWith({
      variables: { brand_doc_id: 'b1', provider: 'RAZORPAY' },
    });
    // ShipRocket is untouched.
    expect(screen.getByText('ship@acme.com')).toBeInTheDocument();
  });

  it('re-checks ShipRocket too, and reports a failed check', async () => {
    m.mutations.ReviewBrandIntegration.mockRejectedValue(new Error('Vendor timeout'));
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations()} />);
    fireEvent.click(screen.getByTestId('brand-integration-check-shiprocket'));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(m.mutations.ReviewBrandIntegration).toHaveBeenCalledWith({
      variables: { brand_doc_id: 'b1', provider: 'SHIPROCKET' },
    });
    expect(screen.getByTestId('brand-integration-check-shiprocket')).toBeEnabled();
  });

  it('hides the sandbox switch while ShipRocket is not configured', () => {
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations({ configured: false, connected: false })} />);
    expect(screen.queryByTestId('brand-integration-sandbox-switch')).not.toBeInTheDocument();
  });

  it('asks before switching to sandbox, then applies the vendor answer', async () => {
    m.mutations.SetBrandShiprocketSandbox.mockResolvedValue({
      data: { setBrandShiprocketSandbox: status({ sandbox: true, sandbox_identifier: 'sbx@acme.com' }) },
    });
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations()} />);
    fireEvent.click(screen.getByTestId('brand-integration-sandbox-switch'));
    expect(await screen.findByText('Switch this brand to sandbox?')).toBeInTheDocument();
    expect(m.mutations.SetBrandShiprocketSandbox).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to sandbox' }));
    await waitFor(() =>
      expect(m.mutations.SetBrandShiprocketSandbox).toHaveBeenCalledWith({ variables: { brand_doc_id: 'b1', sandbox: true } }),
    );
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Sandbox mode is on — this brand now books test orders only.'));
    expect(await screen.findByText('sbx@acme.com')).toBeInTheDocument();
    // A second click while the dialog is still fading out is ignored.
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(m.mutations.SetBrandShiprocketSandbox).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Switch this brand to sandbox?')).not.toBeInTheDocument());
  });

  it('asks before going live and keeps the old status when the vendor returns none', async () => {
    m.mutations.SetBrandShiprocketSandbox.mockResolvedValue({ data: undefined });
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations({ sandbox: true })} />);
    fireEvent.click(screen.getByTestId('brand-integration-sandbox-switch'));
    expect(await screen.findByText('Switch this brand to live?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to live' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Sandbox mode is off — this brand now books real shipments.'));
    expect(screen.getByTestId('brand-integration-sandbox-chip')).toBeInTheDocument();
  });

  it('closes without saving when the switch is cancelled, and reports a failed save', async () => {
    render(<BrandIntegrationsPanel brandId="b1" integrations={integrations()} />);
    fireEvent.click(screen.getByTestId('brand-integration-sandbox-switch'));
    const dialog = (await screen.findByText('Switch this brand to sandbox?')).closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByText('Switch this brand to sandbox?')).not.toBeInTheDocument());
    expect(m.mutations.SetBrandShiprocketSandbox).not.toHaveBeenCalled();

    m.mutations.SetBrandShiprocketSandbox.mockRejectedValue(new Error('Sandbox user missing'));
    fireEvent.click(screen.getByTestId('brand-integration-sandbox-switch'));
    fireEvent.click(await screen.findByRole('button', { name: 'Switch to sandbox' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('BrandStatusPanel', () => {
  function Where() {
    const loc = useLocation();
    return <div data-testid="where">{loc.pathname}</div>;
  }
  const renderPanel = (active: boolean | null, onChanged = vi.fn().mockResolvedValue(undefined)) => {
    render(
      <MemoryRouter initialEntries={['/brand']}>
        <Routes>
          <Route
            path="/brand"
            element={<BrandStatusPanel brand={makeEcommBrandRow({ id: 'b1', brand_name: 'Acme', is_active: active })} onChanged={onChanged} />}
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    return onChanged;
  };

  it('deactivates an active brand after confirming, then re-reads it', async () => {
    const onChanged = renderPanel(true);
    expect(screen.getByTestId('brand-toggle-active')).toHaveTextContent('Deactivate');
    fireEvent.click(screen.getByTestId('brand-toggle-active'));
    const dialog = (await screen.findAllByRole('dialog'))[0];
    expect(m.mutations.SetEcommBrandActive).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(m.mutations.SetEcommBrandActive).toHaveBeenCalledWith({ variables: { brand_doc_id: 'b1', active: false } });
    expect(notifySuccess).toHaveBeenCalledWith('Brand deactivated.');
  });

  it('reactivates a paused brand', async () => {
    const onChanged = renderPanel(false);
    expect(screen.getByTestId('brand-toggle-active')).toHaveTextContent('Reactivate');
    fireEvent.click(screen.getByTestId('brand-toggle-active'));
    const dialog = (await screen.findAllByRole('dialog'))[0];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(m.mutations.SetEcommBrandActive).toHaveBeenCalledWith({ variables: { brand_doc_id: 'b1', active: true } });
    expect(notifySuccess).toHaveBeenCalledWith('Brand reactivated.');
  });

  it('closes the toggle confirmation without changing anything', async () => {
    renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-toggle-active'));
    const dialog = (await screen.findAllByRole('dialog'))[0];
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(m.mutations.SetEcommBrandActive).not.toHaveBeenCalled();
  });

  it('treats an unset flag as not active', () => {
    renderPanel(null);
    expect(screen.getByTestId('brand-toggle-active')).toHaveTextContent('Reactivate');
  });

  it('reports a failed toggle and does not re-read', async () => {
    m.mutations.SetEcommBrandActive.mockRejectedValue(new Error('Locked'));
    const onChanged = renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-toggle-active'));
    const dialog = (await screen.findAllByRole('dialog'))[0];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('requires a reason to delete and clears the error when typing', async () => {
    renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-delete'));
    expect(await screen.findByText('Delete Acme?')).toBeInTheDocument();
    const dialog = screen.getByText('Delete Acme?').closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    expect(await screen.findByText('A reason is required — the partner reads it.')).toBeInTheDocument();
    expect(m.mutations.AdminDeleteEcommBrand).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: '   ' } });
    expect(screen.queryByText('A reason is required — the partner reads it.')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    expect(await screen.findByText('A reason is required — the partner reads it.')).toBeInTheDocument();
  });

  it('deletes with the trimmed reason and returns to the brands list', async () => {
    renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-delete'));
    const dialog = (await screen.findByText('Delete Acme?')).closest('[role="dialog"]') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: '  fraud  ' } });
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/ecomm/brands'));
    expect(m.mutations.AdminDeleteEcommBrand).toHaveBeenCalledWith({ variables: { brand_doc_id: 'b1', notes: 'fraud' } });
    expect(notifySuccess).toHaveBeenCalledWith('Brand deleted.');
  });

  it('stays on the page and reports when the delete fails', async () => {
    m.mutations.AdminDeleteEcommBrand.mockRejectedValue(new Error('Has live orders'));
    renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-delete'));
    const dialog = (await screen.findByText('Delete Acme?')).closest('[role="dialog"]') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'dup' } });
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('starts each delete with an empty reason', async () => {
    renderPanel(true);
    fireEvent.click(screen.getByTestId('brand-delete'));
    const dialog = (await screen.findByText('Delete Acme?')).closest('[role="dialog"]') as HTMLElement;
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'typed' } });
    fireEvent.click(within(dialog).getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByText('Delete Acme?')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('brand-delete'));
    const again = (await screen.findByText('Delete Acme?')).closest('[role="dialog"]') as HTMLElement;
    expect(within(again).getByLabelText(/Reason/)).toHaveValue('');
  });
});

describe('BrandWizardSteps', () => {
  it('labels every step by state: done, to do (required) and optional', () => {
    render(
      <BrandWizardSteps
        completion={{
          percent: 40,
          next_step: 2,
          steps: [
            { key: 'details', complete: true, required: true },
            { key: 'payout', complete: false, required: true },
            { key: 'media', complete: false, required: false },
            { key: 'unknown_step', complete: false, required: false },
          ],
        }}
      />,
    );
    expect(screen.getByText('40% of the wizard complete')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByTestId('brand-step-details')).toHaveTextContent(/· Done$/);
    expect(screen.getByTestId('brand-step-payout')).toHaveTextContent(/· To do$/);
    expect(screen.getByTestId('brand-step-media')).toHaveTextContent(/· Optional$/);
    // A step the portal has no name for shows its key.
    expect(screen.getByTestId('brand-step-unknown_step')).toHaveTextContent('unknown_step · Optional');
  });
});

describe('BrandSubmissionSection', () => {
  const completion = { percent: 100, next_step: 0, steps: [] };

  it('joins the address parts and shows payout facts, decisions and reviewer notes', () => {
    render(
      <BrandSubmissionSection
        brand={makeEcommBrandRow({
          completion,
          address_line1: '12 MG Rd',
          city: 'Pune',
          state: '',
          postal_code: '411001',
          country: 'India',
          established_year: 2015,
          account_holder_name: 'Acme Pvt Ltd',
          account_number: '000111',
          ifsc_code: 'HDFC0001',
          upi_id: 'acme@upi',
          approved_at: '2026-10-03',
          rejected_at: '2026-10-04',
          reviewer_notes: 'Docs verified',
        })}
      />,
    );
    expect(screen.getByText('12 MG Rd, Pune, 411001, India')).toBeInTheDocument();
    expect(screen.getByText('2015')).toBeInTheDocument();
    expect(screen.getByText('acme@upi')).toBeInTheDocument();
    expect(screen.getByText('DT:2026-10-03')).toBeInTheDocument();
    expect(screen.getByText('DT:2026-10-04')).toBeInTheDocument();
    expect(screen.getByText('Docs verified')).toBeInTheDocument();
  });

  it('shows dashes for everything missing and omits the decision rows', () => {
    render(
      <BrandSubmissionSection
        brand={makeEcommBrandRow({
          completion,
          address_line1: '',
          city: null,
          state: null,
          postal_code: null,
          country: null,
          established_year: null,
          account_holder_name: null,
          account_number: '',
          ifsc_code: null,
          upi_id: '',
          approved_at: null,
          rejected_at: null,
          reviewer_notes: '',
        })}
      />,
    );
    expect(screen.queryByText('Approved on')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejected on')).not.toBeInTheDocument();
    expect(screen.queryByText('Reviewer notes')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6);
  });
});
