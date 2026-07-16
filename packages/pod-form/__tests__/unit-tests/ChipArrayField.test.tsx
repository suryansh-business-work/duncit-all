import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ChipArrayField from '../../src/components/ChipArrayField';

function Controlled({ onChange, ...rest }: Readonly<{ onChange?: (v: string[]) => void; max?: number }>) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <ChipArrayField
      label="Tags"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...rest}
    />
  );
}

describe('ChipArrayField', () => {
  it('adds a chip on Enter and clears the draft', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'wifi{Enter}');
    expect(screen.getByText('wifi')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('adds a chip on comma and ignores duplicates', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'parking,');
    expect(screen.getByText('parking')).toBeInTheDocument();
    onChange.mockClear();
    await user.type(input, 'parking{Enter}');
    // duplicate: draft cleared, onChange NOT called again
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('ignores an empty/whitespace draft', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '   {Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits the draft on blur', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'vip');
    await user.tab();
    expect(screen.getByText('vip')).toBeInTheDocument();
  });

  it('does not exceed the max chip count', async () => {
    const user = userEvent.setup();
    render(<Controlled max={1} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'one{Enter}');
    await user.type(input, 'two{Enter}');
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.queryByText('two')).not.toBeInTheDocument();
  });

  it('removes the last chip on Backspace with an empty draft', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'a{Enter}b{Enter}');
    expect(screen.getByText('b')).toBeInTheDocument();
    await user.type(input, '{Backspace}');
    expect(screen.queryByText('b')).not.toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('removes a chip via its delete button', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'x{Enter}');
    await user.click(screen.getByTestId('CancelIcon'));
    expect(screen.queryByText('x')).not.toBeInTheDocument();
  });

  it('shows the error message when provided', () => {
    render(<ChipArrayField label="Tags" value={[]} onChange={vi.fn()} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
