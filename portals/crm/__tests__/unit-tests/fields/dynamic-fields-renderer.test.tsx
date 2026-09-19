import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import DynamicFieldsRenderer from '@/forms/fields/DynamicFieldsRenderer';
import { CRM_DYNAMIC_FIELDS } from '@/api/crm.gql';
import type { CrmDynamicField } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';

vi.mock('@mui/x-date-pickers/DatePicker', async () => ({
  DatePicker: (await import('../helpers/pickerStub')).PickerStub,
}));

const field = (overrides: Partial<CrmDynamicField>): CrmDynamicField => ({
  id: 'f',
  name: 'f',
  label: 'Field',
  kind: 'text',
  options: [],
  multi: false,
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: true,
  required: false,
  sort_order: 0,
  is_active: true,
  created_at: null,
  updated_at: null,
  ...overrides,
});

const FIELDS: CrmDynamicField[] = [
  field({ id: 'd1', name: 'parking_note', label: 'Parking note', hint: 'Shown to hosts', placeholder: 'e.g. 20 cars', default_value: 'Street parking' }),
  field({ id: 'd2', name: 'house_rules', label: 'House rules', kind: 'textarea' }),
  field({ id: 'd3', name: 'rooftop_capacity', label: 'Rooftop capacity', kind: 'number', default_value: '40' }),
  field({ id: 'd4', name: 'has_generator', label: 'Has generator', kind: 'boolean' }),
  field({ id: 'd5', name: 'next_renovation', label: 'Next renovation', kind: 'date', hint: 'Planned closure' }),
  field({ id: 'd6', name: 'venue_tier', label: 'Venue tier', kind: 'select', options: [{ value: 'gold', label: 'Gold' }, { value: 'silver', label: 'Silver' }] }),
  field({ id: 'd7', name: 'cuisines', label: 'Cuisines', kind: 'select', multi: true, hint: 'Pick any', options: [{ value: 'veg', label: 'Veg' }, { value: 'jain', label: 'Jain' }] }),
  field({ id: 'd8', name: 'music', label: 'Music', kind: 'select', multi: true, options: [{ value: 'live', label: 'Live' }] }),
];

const fieldsMock = (entity: string, fields: CrmDynamicField[]): MockedResponse => ({
  request: { query: CRM_DYNAMIC_FIELDS, variables: { entity, include_inactive: false } },
  result: { data: { crmDynamicFields: fields } },
});

/** A form holding the JSON bag the renderer reads and writes, printed for assertions. */
function Harness({ initial, entity }: Readonly<{ initial: string; entity: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD' }>) {
  const methods = useForm({ defaultValues: { dynamic_values_json: initial } });
  const bag = methods.watch('dynamic_values_json');
  return (
    <FormProvider {...methods}>
      <DynamicFieldsRenderer entity={entity} name="dynamic_values_json" />
      <output data-testid="bag">{bag}</output>
    </FormProvider>
  );
}

const renderFields = (initial: string, fields: CrmDynamicField[] = FIELDS, entity: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD' = 'VENUE_LEAD') =>
  renderWithApollo(<Harness initial={initial} entity={entity} />, [fieldsMock(entity, fields)]);

const bag = () => JSON.parse(screen.getByTestId('bag').textContent ?? '{}') as Record<string, unknown>;

const choose = async (label: RegExp, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
};

describe('DynamicFieldsRenderer', () => {
  it('shows each field with its default until a value is entered', async () => {
    renderFields('{"cuisines":["veg","vegan"],"next_renovation":"2026-10-01"}');

    expect(await screen.findByLabelText('Parking note')).toHaveValue('Street parking');
    expect(screen.getByLabelText('Parking note')).toHaveAttribute('placeholder', 'e.g. 20 cars');
    expect(screen.getByText('Shown to hosts')).toBeInTheDocument();
    expect(screen.getByLabelText('House rules')).toHaveValue('');
    expect(screen.getByLabelText('Rooftop capacity')).toHaveValue(40);
    expect(screen.getByLabelText('Has generator')).not.toBeChecked();
    // A stored option that is no longer offered still shows, by its raw value.
    expect(screen.getByText('Veg')).toBeInTheDocument();
    expect(screen.getByText('vegan')).toBeInTheDocument();
    expect(screen.getByText('Pick any')).toBeInTheDocument();
  });

  it('writes every kind of value back into the JSON bag', async () => {
    renderFields('');

    fireEvent.change(await screen.findByLabelText('Parking note'), { target: { value: '12 cars' } });
    fireEvent.change(screen.getByLabelText('House rules'), { target: { value: 'No confetti' } });
    fireEvent.change(screen.getByLabelText('Rooftop capacity'), { target: { value: '55' } });
    fireEvent.click(screen.getByLabelText('Has generator'));
    fireEvent.change(screen.getByLabelText('Next renovation'), { target: { value: '2026-11-15T12:00:00' } });
    await choose(/Venue tier/, 'Gold');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Cuisines/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Jain' }));

    await waitFor(() =>
      expect(bag()).toEqual({
        parking_note: '12 cars',
        house_rules: 'No confetti',
        rooftop_capacity: 55,
        has_generator: true,
        next_renovation: '2026-11-15',
        venue_tier: 'gold',
        cuisines: ['jain'],
      }),
    );
  });

  it('clears number, date and single-select values to null', async () => {
    renderFields('{"rooftop_capacity":30,"next_renovation":"2026-10-01","venue_tier":"silver"}');

    fireEvent.change(await screen.findByLabelText('Rooftop capacity'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Next renovation'), { target: { value: '' } });
    await choose(/Venue tier/, 'None');

    await waitFor(() => expect(bag()).toEqual({ rooftop_capacity: null, next_renovation: null, venue_tier: null }));
  });

  it('starts from an empty bag when the stored JSON is unreadable', async () => {
    renderFields('{not json');

    fireEvent.click(await screen.findByLabelText('Has generator'));

    expect(bag()).toEqual({ has_generator: true });
  });

  it('points to Settings when the lead type has no fields', async () => {
    renderFields('{}', [], 'HOST_LEAD');
    expect(await screen.findByText(/No dynamic fields defined for host leads yet/)).toBeInTheDocument();
  });

  it('shows placeholders while the field catalogue loads', () => {
    const { container } = renderFields('{}', FIELDS, 'ECOMM_LEAD');
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(2);
  });
});
