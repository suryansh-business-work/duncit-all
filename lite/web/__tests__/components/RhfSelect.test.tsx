import { useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RhfSelect } from '../../components/RhfSelect';
import { renderWithProviders } from '../test-utils';

const schema = z.object({ city: z.string().min(1, 'Pick a city') });
type Values = z.infer<typeof schema>;

const CITIES = [
  { value: 'delhi', label: 'Delhi' },
  { value: 'mumbai', label: 'Mumbai' },
];

interface FieldProps {
  initial?: string;
  emptyLabel?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  holder?: { form?: UseFormReturn<Values> };
}

function CityField({ initial = '', emptyLabel, hint, required, disabled, holder }: Readonly<FieldProps>) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { city: initial } });
  useEffect(() => {
    if (holder) holder.form = form;
  }, [form, holder]);
  return <RhfSelect control={form.control} name="city" label="City" options={CITIES} emptyLabel={emptyLabel} hint={hint} required={required} disabled={disabled} testId="city-select" />;
}

const select = () => screen.getByTestId('city-select');

describe('RhfSelect', () => {
  it('is a combobox labelled by its label, showing the chosen option', () => {
    renderWithProviders(<CityField initial="mumbai" />);
    expect(select()).toHaveAttribute('role', 'combobox');
    expect(select()).toHaveAccessibleName(/^City/);
    expect(select()).toHaveTextContent('Mumbai');
  });

  it('writes the picked option’s value into the form', async () => {
    const holder: { form?: UseFormReturn<Values> } = {};
    const { user } = renderWithProviders(<CityField holder={holder} />);
    await user.click(select());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Delhi', 'Mumbai']);
    await user.click(screen.getByRole('option', { name: 'Delhi' }));
    expect(select()).toHaveTextContent('Delhi');
    expect(holder.form?.getValues('city')).toBe('delhi');
  });

  it('offers a blank first choice when the field is optional', async () => {
    const holder: { form?: UseFormReturn<Values> } = {};
    const { user } = renderWithProviders(<CityField initial="delhi" emptyLabel="No city" holder={holder} />);
    await user.click(select());
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['No city', 'Delhi', 'Mumbai']);
    await user.click(options[0]);
    expect(holder.form?.getValues('city')).toBe('');
    expect(select()).not.toHaveTextContent('Delhi');
  });

  it('shows the hint, then the validation message in its place', async () => {
    const holder: { form?: UseFormReturn<Values> } = {};
    renderWithProviders(<CityField hint="Lists the event on that city page" holder={holder} />);
    expect(screen.getByText('Lists the event on that city page')).toBeInTheDocument();
    await act(async () => {
      await holder.form?.trigger('city');
    });
    expect(screen.getByText('Pick a city')).toBeInTheDocument();
    expect(screen.queryByText('Lists the event on that city page')).not.toBeInTheDocument();
  });

  it('marks a required field and can be disabled', () => {
    renderWithProviders(<CityField required disabled />);
    expect(screen.getByText(/City/, { selector: 'label' })).toHaveTextContent('*');
    expect(select()).toHaveAttribute('aria-disabled', 'true');
  });
});
