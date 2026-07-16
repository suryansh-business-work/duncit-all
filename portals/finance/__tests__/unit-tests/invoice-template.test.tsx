import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation, useQuery } from '@apollo/client';
import InvoiceTemplatePage from '../../src/pages/finance/invoice-template-page';
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

describe('InvoiceTemplatePage', () => {
  it('shows a spinner while loading', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<InvoiceTemplatePage kind="venue" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the venue meta and skips mapping when no template exists', () => {
    mockedUseQuery.mockReturnValue({
      data: { financeSettings: { invoice_templates: {} } },
      loading: false,
      refetch: vi.fn(),
    } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: false }] as any);
    renderUI(<InvoiceTemplatePage kind="venue" />);
    expect(screen.getByText('Venue Invoice')).toBeInTheDocument();
  });

  it('maps a template, edits and saves', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    const updateMut = vi.fn().mockResolvedValue({});
    mockedUseQuery.mockReturnValue({
      data: { financeSettings: { invoice_templates: { host: { label: 'HOST BILL', terms: null, footer: 'ty', note: null } } } },
      loading: false,
      refetch,
    } as any);
    mockedUseMutation.mockReturnValue([updateMut, { loading: false }] as any);
    renderUI(<InvoiceTemplatePage kind="host" />);
    expect(screen.getByText('Host Invoice')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Document heading'), { target: { value: 'NEW HEADING' } });
    fireEvent.change(screen.getByLabelText('Terms & conditions'), { target: { value: 'terms' } });
    fireEvent.change(screen.getByLabelText('Footer note'), { target: { value: 'foot' } });
    fireEvent.change(screen.getByLabelText(/email note/i), { target: { value: 'hi' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateMut).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith('Invoice template saved');
    expect(refetch).toHaveBeenCalled();
  });

  it('surfaces a save error', async () => {
    mockedUseQuery.mockReturnValue({
      data: { financeSettings: { invoice_templates: { product: { label: 'P' } } } },
      loading: false,
      refetch: vi.fn(),
    } as any);
    mockedUseMutation.mockReturnValue([vi.fn().mockRejectedValue(new Error('tmpl err')), { loading: false }] as any);
    renderUI(<InvoiceTemplatePage kind="product" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('tmpl err')).toBeInTheDocument();
  });

  it('shows the saving state', () => {
    mockedUseQuery.mockReturnValue({ data: { financeSettings: null }, loading: false, refetch: vi.fn() } as any);
    mockedUseMutation.mockReturnValue([vi.fn(), { loading: true }] as any);
    renderUI(<InvoiceTemplatePage kind="product" />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
