import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import RhfTextField from './RhfTextField';

const schema = z.object({ name: z.string().min(1, 'Name is required') });
type Values = z.input<typeof schema>;

function Harness({ hint, fullWidth, seed = '' }: Readonly<{ hint?: string; fullWidth?: boolean; seed?: string }>) {
  const { control } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: seed },
  });
  return <RhfTextField control={control} name="name" label="Name" hint={hint} fullWidth={fullWidth} />;
}

function NullDefaultHarness() {
  // No default for `name`, so `field.value` is undefined and the `?? ''`
  // fallback branch on the controlled input is exercised.
  const { control } = useForm({ mode: 'onChange' });
  return <RhfTextField control={control} name="name" label="Name" />;
}

describe('RhfTextField', () => {
  it('shows the hint when there is no error and respects explicit fullWidth', () => {
    render(<Harness hint="Helpful hint" fullWidth={false} />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('falls back to a blank helper when no hint is provided', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('.MuiFormHelperText-root')).toBeInTheDocument();
  });

  it('shows the validation error once the value changes', async () => {
    render(<Harness hint="Helpful hint" seed="seed" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('renders an empty string when the field value is undefined', () => {
    render(<NullDefaultHarness />);
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
