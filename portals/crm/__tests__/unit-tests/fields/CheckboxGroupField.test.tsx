import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import CheckboxGroupField from '@/forms/fields/CheckboxGroupField';

/** A form whose `amenities` value is printed so a test can read what the group wrote. */
function Harness({ initial }: Readonly<{ initial?: string[] }>) {
  const methods = useForm<{ amenities?: string[] }>({ defaultValues: initial ? { amenities: initial } : {} });
  const value = methods.watch('amenities');
  return (
    <FormProvider {...methods}>
      <CheckboxGroupField name="amenities" label="Amenities" options={['Parking', 'Wi-Fi', 'Stage']} />
      <output data-testid="value">{JSON.stringify(value ?? null)}</output>
    </FormProvider>
  );
}

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as string[] | null;

describe('CheckboxGroupField', () => {
  it('groups every option under its label, all unchecked when the form holds no value', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Amenities' })).toBeInTheDocument();
    for (const option of ['Parking', 'Wi-Fi', 'Stage']) {
      expect(screen.getByRole('checkbox', { name: option })).not.toBeChecked();
    }
    expect(value()).toBeNull();
  });

  it('adds a ticked option to an empty value', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));

    expect(value()).toEqual(['Wi-Fi']);
    expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).toBeChecked();
  });

  it('appends to and removes from an existing selection', () => {
    render(<Harness initial={['Parking']} />);
    expect(screen.getByRole('checkbox', { name: 'Parking' })).toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Stage' }));
    expect(value()).toEqual(['Parking', 'Stage']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Parking' }));
    expect(value()).toEqual(['Stage']);
    expect(screen.getByRole('checkbox', { name: 'Parking' })).not.toBeChecked();
  });
});
