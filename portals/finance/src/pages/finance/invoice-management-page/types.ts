/** The editable invoice/ticket branding settings (a slice of FinanceSettings). */
export interface InvoiceSettingsForm {
  business_name: string;
  business_address: string;
  business_gstin: string;
  currency_symbol: string;
  invoice_prefix: string;
  invoice_label: string;
  invoice_support_email: string;
  invoice_support_phone: string;
  invoice_footer_note: string;
  invoice_terms: string;
  invoice_logo_url: string;
}

export const EMPTY_INVOICE_SETTINGS: InvoiceSettingsForm = {
  business_name: '',
  business_address: '',
  business_gstin: '',
  currency_symbol: '₹',
  invoice_prefix: 'DUN',
  invoice_label: 'TAX INVOICE',
  invoice_support_email: '',
  invoice_support_phone: '',
  invoice_footer_note: '',
  invoice_terms: '',
  invoice_logo_url: '',
};

export type InvoiceField = keyof InvoiceSettingsForm;
