import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation, useQuery } from '@apollo/client';
import InvoiceManagementPage from '../../src/pages/finance/invoice-management-page';
import InvoicePreview from '../../src/pages/finance/invoice-management-page/InvoicePreview';
import { EMPTY_INVOICE_SETTINGS } from '../../src/pages/finance/invoice-management-page/types';
import { notifySuccess } from './mocks/dialogs';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReset();
  (notifySuccess as any).mockClear();
});

describe('InvoiceManagementPage', () => {
  it('shows a spinner while loading', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<InvoiceManagementPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with absent settings (effect no-op)', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: null }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<InvoiceManagementPage />);
    expect(screen.getByText('Invoice Management')).toBeInTheDocument();
  });

  it('validates the email, blocks then saves, and toggles dummy mode', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    const updateMut = vi.fn().mockResolvedValue({});
    mockedUseQuery.mockReturnValue({
      data: { financeSettings: { business_name: null, dummy_mode: null } },
      loading: false,
      refetch,
    } as any);
    mockedUseMutation.mockReturnValue([updateMut, { loading: false }] as any);
    renderUI(<InvoiceManagementPage />);

    const email = screen.getByLabelText('Support email');
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/please fix the support email/i)).toBeInTheDocument();
    expect(updateMut).not.toHaveBeenCalled();

    // Fix the email and edit another field
    fireEvent.change(email, { target: { value: 'help@duncit.com' } });
    fireEvent.change(screen.getByLabelText(/legal \/ business name/i), { target: { value: 'Acme' } });
    // Toggle dummy mode
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateMut).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith('Invoice settings saved');
    expect(refetch).toHaveBeenCalled();
  });

  it('surfaces a mutation error', async () => {
    mockedUseQuery.mockReturnValue({
      data: { financeSettings: { business_name: 'X', dummy_mode: false } },
      loading: false,
      refetch: vi.fn(),
    } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('save boom')), { loading: false }] as any);
    renderUI(<InvoiceManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('save boom')).toBeInTheDocument();
  });

  it('shows the saving state', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: {} }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    renderUI(<InvoiceManagementPage />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});

describe('InvoicePreview', () => {
  it('renders the empty-state defaults', () => {
    renderUI(<InvoicePreview value={EMPTY_INVOICE_SETTINGS} />);
    expect(screen.getAllByText('Your business').length).toBeGreaterThan(0);
    expect(screen.getByText(/computer-generated invoice/i)).toBeInTheDocument();
  });

  it('falls back to hard defaults when the symbol/label/prefix are blank', () => {
    renderUI(
      <InvoicePreview
        value={{ ...EMPTY_INVOICE_SETTINGS, currency_symbol: '', invoice_label: '', invoice_prefix: '' }}
      />,
    );
    // default label "TAX INVOICE" appears (header)
    expect(screen.getAllByText('TAX INVOICE').length).toBeGreaterThan(0);
    // default invoice prefix "DUN" appears in the invoice number
    expect(screen.getByText(/DUN\/2526/)).toBeInTheDocument();
  });

  it('renders every populated branding value', () => {
    renderUI(
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
