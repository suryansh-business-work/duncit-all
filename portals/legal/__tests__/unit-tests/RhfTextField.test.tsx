import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import RhfTextField from '../../src/forms/components/RhfTextField';

const schema = z.object({ email: z.string().email('Enter a valid email').min(1, 'Email is required') });
type Values = z.infer<typeof schema>;

function Harness({ hint, fullWidth }: Readonly<{ hint?: string; fullWidth?: boolean }>) {
  const { control } = useForm<Values>({
    defaultValues: { email: '' },
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
  return <RhfTextField control={control} name="email" label="Email" hint={hint} fullWidth={fullWidth} />;
}

describe('RhfTextField', () => {
  it('shows the hint when there is no error', () => {
    render(<Harness hint="Use your work email." />);
    expect(screen.getByText('Use your work email.')).toBeInTheDocument();
  });

  it('renders a blank helper when no hint is provided', () => {
    const { container } = render(<Harness />);
    const helper = container.querySelector('.MuiFormHelperText-root');
    expect(helper).toBeTruthy();
    expect(helper?.textContent?.replace(/[\s​]/g, '')).toBe('');
  });

  it('surfaces the validation error after the field is touched', async () => {
    render(<Harness hint="hint" />);
    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument());
  });

  it('respects an explicit fullWidth={false}', () => {
    const { container } = render(<Harness fullWidth={false} />);
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeNull();
  });
});
