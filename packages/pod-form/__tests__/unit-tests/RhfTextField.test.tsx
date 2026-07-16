import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type UseFormReturn } from 'react-hook-form';
import RhfTextField from '../../src/components/RhfTextField';
import type { PodFormValues } from '../../src/types';

interface WrapperProps {
  hint?: string;
  fullWidth?: boolean;
  withDefault?: boolean;
  methodsRef?: { current: UseFormReturn<PodFormValues> | null };
}

function Wrapper({ hint, fullWidth, withDefault = true, methodsRef }: Readonly<WrapperProps>) {
  const defaults = withDefault ? ({ pod_title: '' } as PodFormValues) : ({} as PodFormValues);
  const methods = useForm<PodFormValues>({ defaultValues: defaults });
  if (methodsRef) methodsRef.current = methods;
  return (
    <RhfTextField control={methods.control} name="pod_title" label="Title" hint={hint} fullWidth={fullWidth} />
  );
}

describe('RhfTextField', () => {
  it('shows the hint when there is no error and updates the value', async () => {
    const user = userEvent.setup();
    render(<Wrapper hint="A helpful hint" />);
    expect(screen.getByText('A helpful hint')).toBeInTheDocument();
    const input = screen.getByLabelText('Title');
    await user.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  });

  it('shows the validation error message over the hint', () => {
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(<Wrapper hint="A helpful hint" methodsRef={methodsRef} />);
    act(() => {
      methodsRef.current?.setError('pod_title', { type: 'custom', message: 'Title required' });
    });
    expect(screen.getByText('Title required')).toBeInTheDocument();
    expect(screen.queryByText('A helpful hint')).not.toBeInTheDocument();
  });

  it('falls back to a blank helper and empty value when no hint or default is given', () => {
    render(<Wrapper withDefault={false} fullWidth={false} />);
    const input = screen.getByLabelText('Title');
    expect(input).toHaveValue('');
  });
});
