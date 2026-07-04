import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import AddressFields, { type AddressFieldNames } from '../AddressFields';

interface Form {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

const names: AddressFieldNames<Form> = {
  line1: 'line1',
  line2: 'line2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  country: 'country',
};

function Harness({ required }: Readonly<{ required?: boolean }>) {
  const { control } = useForm<Form>({
    defaultValues: { line1: '', line2: '', landmark: '', city: '', state: '', pincode: '', country: 'India' },
  });
  return <AddressFields control={control} names={names} required={required} />;
}

const textbox = (name: RegExp) => screen.getByRole('textbox', { name });

describe('AddressFields', () => {
  it('renders every postal-address input with its label', () => {
    render(<Harness />);
    expect(textbox(/address line 1/i)).toBeInTheDocument();
    expect(textbox(/address line 2/i)).toBeInTheDocument();
    expect(textbox(/landmark/i)).toBeInTheDocument();
    expect(textbox(/^city/i)).toBeInTheDocument();
    expect(textbox(/^state/i)).toBeInTheDocument();
    expect(textbox(/pincode/i)).toBeInTheDocument();
    expect(textbox(/country/i)).toBeInTheDocument();
  });

  it('seeds the country default from the form value', () => {
    render(<Harness />);
    expect(textbox(/country/i)).toHaveValue('India');
  });

  it('marks line1/city/state/pincode required only when required is set', () => {
    const { unmount } = render(<Harness required />);
    expect(textbox(/address line 1/i)).toBeRequired();
    expect(textbox(/^city/i)).toBeRequired();
    expect(textbox(/^state/i)).toBeRequired();
    expect(textbox(/pincode/i)).toBeRequired();
    expect(textbox(/country/i)).not.toBeRequired();
    unmount();

    render(<Harness />);
    expect(textbox(/address line 1/i)).not.toBeRequired();
  });
});
