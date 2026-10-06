import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import SwitchField from '@/forms/fields/SwitchField';

function ValueProbe() {
  const value = useWatch({ name: 'is_verified' }) as boolean | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({ initial }: Readonly<{ initial?: boolean }>) {
  const methods = useForm<{ is_verified?: boolean }>({
    defaultValues: initial === undefined ? {} : { is_verified: initial },
  });
  return (
    <FormProvider {...methods}>
      <form>
        <SwitchField name="is_verified" label="Verified" />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

describe('SwitchField', () => {
  it('renders an unset value as off and writes true when toggled on', () => {
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Verified' });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('true');
  });

  it('reflects a stored true value and writes false when toggled off', () => {
    render(<Harness initial />);
    const toggle = screen.getByRole('switch', { name: 'Verified' });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });
});
