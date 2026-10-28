import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import SlackChannelField from '../../src/components/SlackChannelField';
import type { SlackChannel } from '../../src/lib/slack-queries';

interface Values {
  channel: string;
}

const channels = [
  { id: 'C0001', name: 'e2e-results', is_private: false },
  { id: 'C0002', name: 'secret-ops', is_private: true },
] as unknown as SlackChannel[];

function Harness({
  initial,
  list = channels,
  onValue,
  error,
}: Readonly<{ initial?: string | null; list?: SlackChannel[]; onValue?: (v: string) => void; error?: string }>) {
  const { control, watch, setError } = useForm<Values>({
    defaultValues: { channel: initial as string },
  });
  const value = watch('channel');
  onValue?.(value);
  useEffect(() => {
    if (error) setError('channel', { message: error });
  }, [error, setError]);
  return (
    <SlackChannelField<Values>
      control={control}
      name="channel"
      label="Slack channel"
      hint="Pick a channel"
      channels={list}
      unknownHint="Not a channel the bot can see"
    />
  );
}

const input = () => screen.getByLabelText('Slack channel') as HTMLInputElement;

describe('SlackChannelField', () => {
  it('shows the saved id as the channel name and its visibility', () => {
    render(<Harness initial="C0001" />);
    expect(input()).toHaveValue('#e2e-results (C0001)');
    expect(screen.getByText('e2e-results')).toBeInTheDocument();
    expect(screen.queryByText('Not a channel the bot can see')).not.toBeInTheDocument();
  });

  it('shows a private channel with the same identity chip', () => {
    render(<Harness initial="C0002" />);
    expect(input()).toHaveValue('#secret-ops (C0002)');
  });

  it('keeps an id the bot has not joined and warns that it is unknown', () => {
    render(<Harness initial="C9999" />);
    expect(input()).toHaveValue('C9999');
    expect(screen.getByText('Not a channel the bot can see')).toBeInTheDocument();
  });

  it('marks the saved channel as the selected option when the list opens', async () => {
    render(<Harness initial="C0002" />);
    fireEvent.mouseDown(input());
    const selected = await screen.findByRole('option', { name: '#secret-ops (C0002)' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: '#e2e-results (C0001)' })).toHaveAttribute('aria-selected', 'false');
  });

  it('still lists every channel when the saved id matches none of them', async () => {
    render(<Harness initial="C9999" />);
    fireEvent.mouseDown(input());
    expect(await screen.findByRole('option', { name: '#e2e-results (C0001)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '#secret-ops (C0002)' })).toBeInTheDocument();
  });

  it('shows neither a chip nor a warning for an empty or missing value', () => {
    const { unmount } = render(<Harness initial="  " />);
    expect(screen.queryByText('Not a channel the bot can see')).not.toBeInTheDocument();
    unmount();
    render(<Harness initial={null} />);
    expect(input()).toHaveValue('');
    expect(screen.queryByText('Not a channel the bot can see')).not.toBeInTheDocument();
  });

  it('stores what is typed as the value so an unjoined channel id can be saved', () => {
    const onValue = vi.fn();
    render(<Harness initial="" onValue={onValue} />);
    fireEvent.change(input(), { target: { value: 'C7777' } });
    expect(onValue).toHaveBeenLastCalledWith('C7777');
    expect(screen.getByText('Not a channel the bot can see')).toBeInTheDocument();
  });


  it('stores the id, not the display label, when an option is picked', async () => {
    const onValue = vi.fn();
    render(<Harness initial="" onValue={onValue} />);
    fireEvent.mouseDown(input());
    fireEvent.click(await screen.findByRole('option', { name: '#secret-ops (C0002)' }));
    await waitFor(() => expect(onValue).toHaveBeenLastCalledWith('C0002'));
    expect(input()).toHaveValue('#secret-ops (C0002)');
  });

  it('clears the value back to empty', async () => {
    const onValue = vi.fn();
    render(<Harness initial="C0001" onValue={onValue} />);
    fireEvent.mouseEnter(input());
    fireEvent.click(screen.getByLabelText('Clear'));
    await waitFor(() => expect(onValue).toHaveBeenLastCalledWith(''));
  });

  it('prefers the validation message over the hint', () => {
    render(<Harness initial="" error="Pick a channel first" />);
    expect(screen.getByText('Pick a channel first')).toBeInTheDocument();
    expect(screen.queryByText('Pick a channel')).not.toBeInTheDocument();
  });

  it('shows the hint when valid', () => {
    render(<Harness initial="" />);
    expect(screen.getByText('Pick a channel')).toBeInTheDocument();
  });
});
