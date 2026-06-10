import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ManageDynamicFieldsPage from '@/pages/ManageDynamicFieldsPage';
import { CRM_DYNAMIC_FIELDS } from '@/api/crm.gql';

const row = {
  id: 'f1',
  name: 'budget_band',
  label: 'Budget Band',
  kind: 'select',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ],
  multi: false,
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  required: false,
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const listMock = () => ({
  request: { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
  result: { data: { crmDynamicFields: [row] } },
});

const wrap = (mocks: any[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ManageDynamicFieldsPage />
    </MockedProvider>
  );

describe('ManageDynamicFieldsPage', () => {
  it('renders the title and a row from the catalogue', async () => {
    wrap([listMock()]);
    expect(await screen.findByText(/Dynamic Fields/)).toBeTruthy();
    expect(await screen.findByText('Budget Band')).toBeTruthy();
  });

  it('opens the new-field draft panel on click', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    // The auto-generated key input is gone; the Label input identifies the form.
    expect(screen.getByLabelText('dynamic-field-label')).toBeTruthy();
    expect(screen.getByLabelText('dynamic-field-placeholder')).toBeTruthy();
    expect(screen.getByLabelText('dynamic-field-hint')).toBeTruthy();
  });

  it('shows validation error when label is empty and Save is pressed', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));
    expect(await screen.findByText(/Label is required/i)).toBeTruthy();
  });

  it('shows validation error when neither Venue nor Host applies', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'X' } });
    fireEvent.click(screen.getByLabelText(/Applies to Venue/i));
    fireEvent.click(screen.getByLabelText(/Applies to Host/i));
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));
    expect(await screen.findByText(/applies to Venue \/ Host/i)).toBeTruthy();
  });
});
