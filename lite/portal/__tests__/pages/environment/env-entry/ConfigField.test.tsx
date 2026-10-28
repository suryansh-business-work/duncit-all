import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import type { LiteEnvFieldDef } from '../../../../graphql/environment';
import { ConfigField } from '../../../../pages/environment/env-entry/ConfigField';
import type { EnvEntryFormValues } from '../../../../pages/environment/env-entry';
import { makeField } from '../../../fixtures';

interface HarnessProps {
  field: LiteEnvFieldDef;
  config?: Record<string, string>;
  secretKept?: boolean;
  disabled?: boolean;
}

function Harness({ field, config = {}, secretKept = false, disabled = false }: Readonly<HarnessProps>) {
  const { control, watch } = useForm<EnvEntryFormValues>({ defaultValues: { name: '', description: '', is_default: false, is_active: true, config } });
  return (
    <>
      <ConfigField control={control} field={field} secretKept={secretKept} disabled={disabled} />
      <output data-testid="value">{watch(`config.${field.name}`)}</output>
    </>
  );
}

const tls = makeField({ name: 'secure', label: 'Use TLS', bool: true, hint: null });
const password = makeField({ name: 'password', label: 'Password', secret: true, hint: 'SMTP password' });

describe('ConfigField', () => {
  it("renders a boolean as a labelled switch that stores 'true' / 'false'", async () => {
    const user = userEvent.setup();
    render(<Harness field={tls} config={{ secure: 'true' }} />);
    const toggle = screen.getByLabelText('Use TLS');
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    await user.click(toggle);
    expect(screen.getByTestId('value')).toHaveTextContent('true');
  });

  it('starts an unset boolean switched off and can disable it', () => {
    render(<Harness field={tls} disabled />);
    expect(screen.getByLabelText('Use TLS')).not.toBeChecked();
    expect(screen.getByLabelText('Use TLS')).toBeDisabled();
  });

  it("renders a text field with the vendor's hint, optional and editable", async () => {
    const user = userEvent.setup();
    render(<Harness field={makeField()} config={{ host: 'smtp.example.com' }} />);
    const box = screen.getByTestId('env-config-host');
    expect(screen.getByLabelText('SMTP Host')).toBe(box);
    expect(box).toHaveValue('smtp.example.com');
    expect(box).not.toBeRequired();
    expect(box).toHaveAttribute('type', 'text');
    expect(box).not.toHaveAttribute('inputmode');
    expect(screen.getByText('e.g. smtp.gmail.com')).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'smtp.other.example');
    expect(screen.getByTestId('value')).toHaveTextContent('smtp.other.example');
  });

  it('opens a numeric keypad for a number field and starts it blank when unset', () => {
    render(<Harness field={makeField({ name: 'port', label: 'Port', number: true, min: 1, max: 65_535 })} />);
    const box = screen.getByTestId('env-config-port');
    expect(box).toHaveAttribute('inputmode', 'numeric');
    expect(box).toHaveValue('');
  });

  it('masks a secret that must be entered, says it is required and offers a reveal toggle', async () => {
    const user = userEvent.setup();
    render(<Harness field={password} />);
    const box = screen.getByTestId('env-config-password');
    expect(box).toHaveAttribute('type', 'password');
    expect(box).toBeRequired();
    expect(box).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText('Required')).toBeInTheDocument();

    const show = screen.getByRole('button', { name: 'Show Password' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await user.click(show);
    expect(box).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Hide Password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    await user.click(hide);
    expect(box).toHaveAttribute('type', 'password');
  });

  it('tells the admin a blank secret keeps the stored one', () => {
    render(<Harness field={password} secretKept />);
    expect(screen.getByTestId('env-config-password')).not.toBeRequired();
    expect(screen.getByText('Leave blank to keep the stored value')).toBeInTheDocument();
    expect(screen.queryByText('SMTP password')).not.toBeInTheDocument();
  });

  it('keeps a blank helper line for a field without a hint and locks it when disabled', () => {
    render(<Harness field={makeField({ name: 'from_name', label: 'From Name', hint: null })} disabled />);
    const box = screen.getByTestId('env-config-from_name');
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('autocomplete', 'off');
  });
});
