import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceManagementPage from '../../src/pages/finance/invoice-management-page';
import InvoicePreview from '../../src/pages/finance/invoice-management-page/InvoicePreview';
import { EMPTY_INVOICE_SETTINGS } from '../../src/pages/finance/invoice-management-page/types';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  invoiceSettingsLoadingMock,
  invoiceSettingsMock,
  makeInvoiceSettings,
  nullInvoiceSettings,
  updateInvoiceSettingsMock,
} from '../mocks/invoice.mock';

beforeEach(() => {
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
});

describe('InvoiceManagementPage', () => {
  it('shows a spinner while loading', () => {
    renderWithProviders(<InvoiceManagementPage />, { mocks: [invoiceSettingsLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with absent settings (effect no-op)', async () => {
    renderWithProviders(<InvoiceManagementPage />, { mocks: [invoiceSettingsMock(null)] });
    expect(await screen.findByText('Invoice Management')).toBeInTheDocument();
  });

  it('applies every default when the branding fields are null', async () => {
    renderWithProviders(<InvoiceManagementPage />, { mocks: [invoiceSettingsMock(nullInvoiceSettings())] });
    await screen.findByText('Invoice Management');
    // currency_symbol → ₹, invoice_prefix → DUN, invoice_label → TAX INVOICE.
    await waitFor(() => expect(screen.getAllByText('TAX INVOICE').length).toBeGreaterThan(0));
    expect(screen.getByText(/DUN\/2526/)).toBeInTheDocument();
  });

  it('validates the email, blocks then saves, and toggles dummy mode', async () => {
    renderWithProviders(<InvoiceManagementPage />, {
      mocks: [
        invoiceSettingsMock(makeInvoiceSettings({ business_name: null, dummy_mode: null })),
        updateInvoiceSettingsMock(),
      ],
    });
    await screen.findByText('Invoice Management');

    const email = screen.getByLabelText('Support email');
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/please fix the support email/i)).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'help@duncit.com' } });
    fireEvent.change(screen.getByLabelText(/legal \/ business name/i), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Invoice settings saved'));
  });

  it('surfaces a mutation error', async () => {
    renderWithProviders(<InvoiceManagementPage />, {
      mocks: [
        invoiceSettingsMock(makeInvoiceSettings({ business_name: 'X', dummy_mode: false })),
        updateInvoiceSettingsMock({ fail: true }),
      ],
    });
    await screen.findByText('Invoice Management');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('save boom')).toBeInTheDocument();
  });

  it('shows the saving state', async () => {
    renderWithProviders(<InvoiceManagementPage />, {
      mocks: [invoiceSettingsMock(), updateInvoiceSettingsMock({ delay: 60_000 })],
    });
    await screen.findByText('Invoice Management');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});

describe('InvoicePreview', () => {
  it('renders the empty-state defaults', () => {
    renderWithProviders(<InvoicePreview value={EMPTY_INVOICE_SETTINGS} />);
    expect(screen.getAllByText('Your business').length).toBeGreaterThan(0);
    expect(screen.getByText(/computer-generated invoice/i)).toBeInTheDocument();
  });

  it('falls back to hard defaults when the symbol/label/prefix are blank', () => {
    renderWithProviders(
      <InvoicePreview
        value={{ ...EMPTY_INVOICE_SETTINGS, currency_symbol: '', invoice_label: '', invoice_prefix: '' }}
      />,
    );
    expect(screen.getAllByText('TAX INVOICE').length).toBeGreaterThan(0);
    expect(screen.getByText(/DUN\/2526/)).toBeInTheDocument();
  });

  it('renders every populated branding value', () => {
    renderWithProviders(
      <InvoicePreview
        value={{
          business_name: 'Duncit Pvt Ltd',
          business_address: '1 MG Road',
          business_gstin: '29ABCDE1234F1Z5',
          currency_symbol: '$',
          invoice_prefix: 'INV',
          invoice_label: 'BILL',
          invoice_support_email: 'help@duncit.com',
          invoice_support_phone: '+91 90000',
          invoice_footer_note: 'Thanks!',
          invoice_terms: 'Net 30',
          invoice_logo_url: 'https://img/logo.png',
        }}
      />,
    );
    expect(screen.getByAltText('logo')).toBeInTheDocument();
    expect(screen.getByText('1 MG Road')).toBeInTheDocument();
    expect(screen.getByText(/29ABCDE1234F1Z5/)).toBeInTheDocument();
    expect(screen.getByText(/help@duncit.com/)).toBeInTheDocument();
    expect(screen.getByText('Thanks!')).toBeInTheDocument();
    expect(screen.getByText(/Net 30/)).toBeInTheDocument();
  });
});
