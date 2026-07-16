import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type UseFormReturn } from 'react-hook-form';
import RhfTextField from '../src/components/RhfTextField';
import type { ClubFormValues } from '../src/types';

interface HostProps {
  hint?: string;
  fullWidth?: boolean;
  onMethods?: (m: UseFormReturn<ClubFormValues>) => void;
}

function Host({ hint, fullWidth, onMethods }: Readonly<HostProps>) {
  const methods = useForm<ClubFormValues>({ defaultValues: {} });
  onMethods?.(methods);
  return (
    <RhfTextField
      control={methods.control}
      name="club_name"
      label="Club name"
      hint={hint}
      fullWidth={fullWidth}
    />
  );
}

describe('RhfTextField', () => {
  it('shows the hint when there is no error and defaults an undefined value to ""', () => {
    render(<Host hint="pick a name" />);
    const input = screen.getByLabelText('Club name') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByText('pick a name')).toBeInTheDocument();
  });

  it('renders a single space helper text when neither error nor hint is set', () => {
    const { container } = render(<Host fullWidth={false} />);
    const helper = container.querySelector('.MuiFormHelperText-root');
    // A lone " " helperText: MUI swaps it for a zero-width-space "notranslate"
    // span, so there is no visible hint text.
    expect(helper).toBeInTheDocument();
    expect(helper?.querySelector('.notranslate')).toBeInTheDocument();
  });

  it('updates the RHF value as the user types', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(<Host onMethods={(m) => { methods = m; }} />);
    await user.type(screen.getByLabelText('Club name'), 'Chess');
    expect(methods?.getValues('club_name')).toBe('Chess');
  });

  it('shows the validation error message over the hint', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(<Host hint="pick a name" onMethods={(m) => { methods = m; }} />);
    act(() => methods?.setError('club_name', { message: 'Club name is required' }));
    expect(screen.getByText('Club name is required')).toBeInTheDocument();
    const input = screen.getByLabelText('Club name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
