import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';

// MUI's freeSolo Autocomplete reports a typed id through onChange as a plain
// string (the "createOption" path) — a path the real widget only reaches when
// the typed text is not already the value. The stub lets the handler be driven
// with each of the three payloads the real one can deliver.
vi.mock('@mui/material', async (io) => {
  const actual = await io<typeof import('@mui/material')>();
  return {
    ...actual,
    Autocomplete: (p: {
      onChange: (e: unknown, value: unknown, reason: string) => void;
      renderInput: (params: Record<string, unknown>) => React.ReactNode;
    }) => (
      <div>
        {p.renderInput({})}
        <button type="button" onClick={() => p.onChange(null, 'C5555', 'createOption')}>
          commit-string
        </button>
        <button type="button" onClick={() => p.onChange(null, { id: 'C0001', name: 'e2e' }, 'selectOption')}>
          commit-option
        </button>
        <button type="button" onClick={() => p.onChange(null, null, 'clear')}>
          commit-null
        </button>
      </div>
    ),
  };
});

import SlackChannelField from '../../src/components/SlackChannelField';

function Harness({ onValue }: Readonly<{ onValue: (v: string) => void }>) {
  const { control, watch } = useForm<{ channel: string }>({ defaultValues: { channel: 'C0009' } });
  onValue(watch('channel'));
  return (
    <SlackChannelField<{ channel: string }>
      control={control}
      name="channel"
      label="Channel"
      hint="hint"
      channels={[]}
      unknownHint="unknown"
    />
  );
}

describe('SlackChannelField onChange payloads', () => {
  it('stores a created string as-is, an option as its id and a cleared value as empty', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    fireEvent.click(screen.getByText('commit-string'));
    expect(onValue).toHaveBeenLastCalledWith('C5555');
    fireEvent.click(screen.getByText('commit-option'));
    expect(onValue).toHaveBeenLastCalledWith('C0001');
    fireEvent.click(screen.getByText('commit-null'));
    expect(onValue).toHaveBeenLastCalledWith('');
  });
});
