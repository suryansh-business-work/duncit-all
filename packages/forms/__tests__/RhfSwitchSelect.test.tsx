import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type Control } from 'react-hook-form';
import RhfSelect from '../src/RhfSelect';
import RhfSwitch from '../src/RhfSwitch';

interface Values {
  enabled: boolean;
  env: string;
  sources: string[];
}

const OPTIONS = [
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'SLACK', label: 'Slack' },
  { value: 'GMAIL', label: 'Gmail', disabled: true },
];

function Harness({ onValues }: Readonly<{ onValues: (v: Values) => void }>) {
  const { control, watch, setError } = useForm<Values, unknown, Values>({ defaultValues: { enabled: false, env: 'STAGING', sources: ['GITHUB'] } });
  const values = watch();
  return (
    <>
      <RhfSwitch control={control as Control<Values>} name="enabled" label="Auto sync" hint="Keep sources fresh" />
      <RhfSelect control={control as Control<Values>} name="env" label="Environment" hint="Where to read" options={[{ value: 'STAGING', label: 'Staging' }, { value: 'PRODUCTION', label: 'Production' }]} />
      <RhfSelect control={control as Control<Values>} name="sources" label="Sources" multiple options={OPTIONS} />
      <button type="button" onClick={() => onValues(values)}>read</button>
      <button type="button" onClick={() => setError('env', { message: 'Pick one' })}>break</button>
    </>
  );
}

describe('RhfSwitch', () => {
  it('is named by its label, described by its hint, and toggles the boolean', async () => {
    let seen: Values | null = null;
    render(<Harness onValues={(v) => (seen = v)} />);
    const toggle = screen.getByRole('switch', { name: 'Auto sync' });
    expect(toggle).toHaveAccessibleDescription('Keep sources fresh');
    expect(toggle).not.toBeChecked();
    await userEvent.click(screen.getByText('Auto sync'));
    expect(toggle).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'read' }));
    expect(seen?.enabled).toBe(true);
  });
});

describe('RhfSelect', () => {
  it('shows the hint until there is an error, then the error message', async () => {
    render(<Harness onValues={() => undefined} />);
    expect(screen.getByText('Where to read')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'break' }));
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(screen.queryByText('Where to read')).not.toBeInTheDocument();
  });

  it('writes the picked value of a single select', async () => {
    let seen: Values | null = null;
    render(<Harness onValues={(v) => (seen = v)} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Environment' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Production' }));
    await userEvent.click(screen.getByRole('button', { name: 'read' }));
    expect(seen?.env).toBe('PRODUCTION');
  });

  it('lists the chosen labels and adds a value in multiple mode, but never a disabled option', async () => {
    let seen: Values | null = null;
    render(<Harness onValues={(v) => (seen = v)} />);
    const combo = screen.getByRole('combobox', { name: 'Sources' });
    expect(combo).toHaveTextContent('GitHub');
    await userEvent.click(combo);
    const list = within(screen.getByRole('listbox'));
    expect(list.getByRole('option', { name: 'Gmail' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(list.getByRole('option', { name: 'Slack' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'read' }));
    expect(seen?.sources).toEqual(['GITHUB', 'SLACK']);
  });
});
