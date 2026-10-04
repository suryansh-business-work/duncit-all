import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import PhoneField from '@/forms/fields/PhoneField';

type Values = { phone?: string; phone_ext?: string };

function Probe() {
  const [phone, ext] = useWatch<Values>({ name: ['phone', 'phone_ext'] });
  const { dirtyFields } = useFormState<Values>();
  return (
    <output data-testid="probe">{JSON.stringify({ phone: phone ?? null, ext: ext ?? null, extDirty: !!dirtyFields.phone_ext })}</output>
  );
}

function Harness({ initial = {}, error }: Readonly<{ initial?: Values; error?: string }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  useEffect(() => {
    if (error) methods.setError('phone', { message: error });
  }, [error, methods]);
  return (
    <FormProvider {...methods}>
      <form>
        <PhoneField name="phone" label="Phone" required />
        <Probe />
      </form>
    </FormProvider>
  );
}

const probe = () =>
  JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as { phone: string | null; ext: string | null; extDirty: boolean };

describe('PhoneField', () => {
  it('defaults the dial code to +91 and renders an unset number as empty', () => {
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: /phone/i });
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByRole('combobox')).toHaveTextContent('+91');
  });

  it('shows the stored number and dial code and writes typed digits back', () => {
    render(<Harness initial={{ phone: '5550100', phone_ext: '+44' }} />);
    const input = screen.getByRole('textbox', { name: /phone/i });
    expect(input).toHaveValue('5550100');
    expect(screen.getByRole('combobox')).toHaveTextContent('+44');

    fireEvent.change(input, { target: { value: '5550199' } });

    expect(probe().phone).toBe('5550199');
  });

  it('stores the picked dial code in the sibling _ext field and marks it dirty', () => {
    render(<Harness initial={{ phone: '98765' }} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(14);

    fireEvent.click(within(listbox).getByRole('option', { name: /AE \+971/ }));

    expect(probe()).toEqual({ phone: '98765', ext: '+971', extDirty: true });
    expect(screen.getByRole('combobox')).toHaveTextContent('+971');
  });

  it('shows the validation error under the number', () => {
    render(<Harness initial={{ phone: '12' }} error="Enter a valid phone number" />);
    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /phone/i })).toHaveAttribute('aria-invalid', 'true');
  });
});
