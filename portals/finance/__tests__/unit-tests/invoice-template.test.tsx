import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceTemplatePage from '../../src/pages/finance/invoice-template-page';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  invoiceTemplatesLoadingMock,
  invoiceTemplatesMock,
  invoiceTemplatesNullSettingsMock,
  makeInvoiceTemplates,
  makeTemplate,
  updateInvoiceTemplateMock,
} from '../mocks/invoice-template.mock';

beforeEach(() => {
  (notifySuccess as unknown as { mockClear: () => void }).mockClear();
});

describe('InvoiceTemplatePage', () => {
  it('shows a spinner while loading', () => {
    renderWithProviders(<InvoiceTemplatePage kind="venue" />, { mocks: [invoiceTemplatesLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the venue meta and skips mapping when no template exists', async () => {
    renderWithProviders(<InvoiceTemplatePage kind="venue" />, { mocks: [invoiceTemplatesMock(null)] });
    expect(await screen.findByText('Venue Invoice')).toBeInTheDocument();
  });

  it('maps a template, edits and saves', async () => {
    renderWithProviders(<InvoiceTemplatePage kind="host" />, {
      mocks: [
        invoiceTemplatesMock(
          makeInvoiceTemplates({
            host: makeTemplate({ label: 'HOST BILL', terms: 'net 30', footer: 'ty', note: 'covering' }),
          }),
        ),
        updateInvoiceTemplateMock(),
      ],
    });
    expect(await screen.findByText('Host Invoice')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Document heading'), { target: { value: 'NEW HEADING' } });
    fireEvent.change(screen.getByLabelText('Terms & conditions'), { target: { value: 'terms' } });
    fireEvent.change(screen.getByLabelText('Footer note'), { target: { value: 'foot' } });
    fireEvent.change(screen.getByLabelText(/email note/i), { target: { value: 'hi' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Invoice template saved'));
  });

  it('surfaces a save error and maps a template with null fields', async () => {
    renderWithProviders(<InvoiceTemplatePage kind="product" />, {
      mocks: [
        invoiceTemplatesMock(
          makeInvoiceTemplates({
            product: makeTemplate({ label: null, terms: null, footer: null, note: null }),
          }),
        ),
        updateInvoiceTemplateMock({ fail: true }),
      ],
    });
    await screen.findByText('Product Invoice');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('tmpl err')).toBeInTheDocument();
  });

  it('shows the saving state', async () => {
    renderWithProviders(<InvoiceTemplatePage kind="product" />, {
      mocks: [invoiceTemplatesNullSettingsMock(), updateInvoiceTemplateMock({ delay: 60_000 })],
    });
    await screen.findByText('Product Invoice');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled());
  });
});
