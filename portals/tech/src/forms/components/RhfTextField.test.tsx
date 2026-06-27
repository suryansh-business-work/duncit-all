import { describe, expect, it } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RhfTextField from './RhfTextField';

const schema = z.object({ email: z.string().min(1, 'Email is required').email('Enter a valid email') });
type Values = z.infer<typeof schema>;

function Harness({ hint, fullWidth }: Readonly<{ hint?: string; fullWidth?: boolean }>) {
  const { control } = useForm<Values>({
    defaultValues: { email: '' },
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
  return <RhfTextField control={control} name="email" label="Email" hint={hint} fullWidth={fullWidth} />;
}

function NullHarness() {
  const { control } = useForm<Values>({ defaultValues: { email: undefined } });
  return <RhfTextField control={control} name="email" label="Email" />;
}

describe('RhfTextField', () => {
  it('shows the hint when there is no error', () => {
    render(<Harness hint="Use your work email" />);
    expect(screen.getByText('Use your work email')).toBeInTheDocument();
  });

  it('renders a blank helper when no hint is supplied', () => {
    const { container } = render(<Harness />);
    const helper = container.querySelector('.MuiFormHelperText-root');
    expect((helper?.textContent ?? '').trim().replace(/​/g, '')).toBe('');
  });

  it('shows the validation error after blur', async () => {
    render(<Harness hint="h" />);
    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument());
  });

  it('respects an explicit fullWidth={false}', () => {
    const { container } = render(<Harness fullWidth={false} />);
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeNull();
  });

  it('coerces a nullish field value to an empty string', () => {
    render(<NullHarness />);
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  });
});
