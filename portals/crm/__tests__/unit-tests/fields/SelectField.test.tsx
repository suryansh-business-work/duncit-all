import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import SelectField from '@/forms/fields/SelectField';

const OPTIONS = ['Hot', 'Warm', 'Cold'];

function ValueProbe() {
  const value = useWatch({ name: 'priority' }) as string | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({
  initial,
  hint,
  error,
  allowEmpty,
}: Readonly<{ initial?: string; hint?: string; error?: string; allowEmpty?: boolean }>) {
  const methods = useForm<{ priority?: string }>({
    defaultValues: initial === undefined ? {} : { priority: initial },
  });
  useEffect(() => {
    if (error) methods.setError('priority', { message: error });
  }, [error, methods]);
  return (
    <FormProvider {...methods}>
      <form>
        <SelectField name="priority" label="Priority" options={OPTIONS} hint={hint} allowEmpty={allowEmpty} />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as string | null;
const openMenu = () => fireEvent.mouseDown(screen.getByRole('combobox', { name: /priority/i }));

describe('SelectField', () => {
  it('shows the stored value and writes the picked option back to the form', () => {
    render(<Harness initial="Warm" hint="How likely to close" />);
    expect(screen.getByRole('combobox', { name: /priority/i })).toHaveTextContent('Warm');
    expect(screen.getByText('How likely to close')).toBeInTheDocument();

    openMenu();
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Cold' }));

    expect(value()).toBe('Cold');
  });

  it('offers a None option by default and renders an unset value as empty', () => {
    render(<Harness />);
    openMenu();
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['None', 'Hot', 'Warm', 'Cold']);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('omits the None option when allowEmpty is false', () => {
    render(<Harness initial="Hot" allowEmpty={false} />);
    openMenu();
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Hot', 'Warm', 'Cold']);
  });

  it('shows the validation error in place of the hint', () => {
    render(<Harness initial="" hint="How likely to close" error="Priority is required" />);
    expect(screen.getByText('Priority is required')).toBeInTheDocument();
    expect(screen.queryByText('How likely to close')).not.toBeInTheDocument();
  });

  it('keeps an empty helper line when there is no hint or error', () => {
    const { container } = render(<Harness initial="" />);
    // MUI swaps the reserved ' ' line for a zero-width space.
    expect((container.querySelector('.MuiFormHelperText-root') as HTMLElement).textContent).toBe('​');
  });
});
