import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import MultiSelectField from '@/forms/fields/MultiSelectField';

const OPTIONS = ['Yoga', 'Pilates', 'Zumba'];

function ValueProbe() {
  const value = useWatch({ name: 'activities' }) as string[] | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({
  initial,
  hint,
  error,
}: Readonly<{ initial?: string[]; hint?: string; error?: string }>) {
  const methods = useForm<{ activities?: string[] }>({
    defaultValues: initial === undefined ? {} : { activities: initial },
  });
  useEffect(() => {
    if (error) methods.setError('activities', { message: error });
  }, [error, methods]);
  return (
    <FormProvider {...methods}>
      <form>
        <MultiSelectField name="activities" label="Activities" options={OPTIONS} hint={hint} required />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as string[] | null;

describe('MultiSelectField', () => {
  it('names the combobox by its label and shows the current picks as chips', () => {
    render(<Harness initial={['Yoga', 'Zumba']} hint="Pick all that apply" />);
    const combo = screen.getByRole('combobox', { name: /activities/i });
    expect(within(combo).getByText('Yoga')).toBeInTheDocument();
    expect(within(combo).getByText('Zumba')).toBeInTheDocument();
    expect(screen.getByText('Pick all that apply')).toBeInTheDocument();
  });

  it('adds a ticked option to the array value from the menu', () => {
    render(<Harness initial={['Yoga']} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /activities/i }));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('checkbox', { checked: true })).toHaveLength(1);

    fireEvent.click(within(listbox).getByRole('option', { name: 'Pilates' }));

    expect(value()).toEqual(['Yoga', 'Pilates']);
  });

  it('treats an unset value as an empty selection', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /activities/i }));
    expect(within(screen.getByRole('listbox')).queryAllByRole('checkbox', { checked: true })).toHaveLength(0);

    fireEvent.click(screen.getByRole('option', { name: 'Zumba' }));

    expect(value()).toEqual(['Zumba']);
  });

  it('splits a comma-joined string value (browser autofill) into an array', () => {
    const { container } = render(<Harness initial={[]} />);
    const nativeInput = container.querySelector<HTMLInputElement>('input.MuiSelect-nativeInput') as HTMLInputElement;

    fireEvent.change(nativeInput, { target: { value: 'Pilates' } });

    expect(value()).toEqual(['Pilates']);
  });

  it('shows the validation error in place of the hint', () => {
    render(<Harness initial={[]} hint="Pick all that apply" error="Pick at least one activity" />);
    expect(screen.getByText('Pick at least one activity')).toBeInTheDocument();
    expect(screen.queryByText('Pick all that apply')).not.toBeInTheDocument();
  });

  it('keeps an empty helper line when there is no hint or error', () => {
    const { container } = render(<Harness initial={[]} />);
    const helper = container.querySelector('.MuiFormHelperText-root') as HTMLElement;
    // MUI swaps the reserved ' ' line for a zero-width space.
    expect(helper.textContent).toBe('​');
    expect(helper).not.toHaveClass('Mui-error');
  });
});
