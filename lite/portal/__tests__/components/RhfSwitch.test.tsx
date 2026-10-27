import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { RhfSwitch } from '../../components/RhfSwitch';

interface Values {
  reminders: boolean;
}

function Harness({ initial = false, hint, disabled }: Readonly<{ initial?: boolean; hint?: string; disabled?: boolean }>) {
  const { control, watch } = useForm<Values>({ defaultValues: { reminders: initial } });
  return (
    <>
      <RhfSwitch control={control} name="reminders" label="Send reminders" hint={hint} disabled={disabled} testId="reminders-switch" />
      <output data-testid="value">{String(watch('reminders'))}</output>
    </>
  );
}

describe('RhfSwitch', () => {
  it('is labelled, reflects the form value and writes a boolean back on toggle', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Send reminders');
    expect(input).toBe(screen.getByTestId('reminders-switch'));
    expect(input).not.toBeChecked();

    await user.click(input);
    expect(input).toBeChecked();
    expect(screen.getByTestId('value')).toHaveTextContent('true');

    await user.click(input);
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });

  it('starts checked from a true default', () => {
    render(<Harness initial />);
    expect(screen.getByLabelText('Send reminders')).toBeChecked();
  });

  it('shows the hint under the switch only when one is given', () => {
    const { rerender } = render(<Harness hint="To every confirmed guest" />);
    expect(screen.getByText('To every confirmed guest')).toBeInTheDocument();
    rerender(<Harness />);
    expect(screen.queryByText('To every confirmed guest')).not.toBeInTheDocument();
  });

  it('disables the switch and its label together', () => {
    render(<Harness disabled />);
    expect(screen.getByLabelText('Send reminders')).toBeDisabled();
    expect(screen.getByText('Send reminders')).toHaveClass('Mui-disabled');
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });
});
