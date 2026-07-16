import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ReelField from '../../src/components/ReelField';

function Controlled({
  initial = '',
  onPickVideo,
  error,
}: Readonly<{ initial?: string; onPickVideo?: () => Promise<string | null>; error?: string }>) {
  const [value, setValue] = useState(initial);
  return <ReelField value={value} onChange={setValue} onPickVideo={onPickVideo} error={error} />;
}

describe('ReelField', () => {
  it('renders a plain URL input when no picker is given and reports typed input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReelField value="" onChange={onChange} />);
    const input = screen.getByLabelText('Reel video URL');
    await user.type(input, 'h');
    expect(onChange).toHaveBeenCalledWith('h');
    expect(screen.getByText('Shows in Explore while the pod is live.')).toBeInTheDocument();
  });

  it('shows the error message instead of the helper', () => {
    render(<Controlled error="Bad reel URL" />);
    // appears in the caption and in the TextField helper text
    expect(screen.getAllByText('Bad reel URL').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Shows in Explore while the pod is live.')).not.toBeInTheDocument();
  });

  it('shows the dropzone when a picker is given and no value', () => {
    render(<Controlled onPickVideo={vi.fn().mockResolvedValue(null)} />);
    expect(screen.getByText(/No reel yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick video' })).toBeInTheDocument();
  });

  it('picks a video and shows the preview + remove button', async () => {
    const user = userEvent.setup();
    render(<Controlled onPickVideo={vi.fn().mockResolvedValue('https://a.com/picked.mp4')} />);
    await user.click(screen.getByRole('button', { name: 'Pick video' }));
    const preview = await screen.findByRole('button', { name: 'Replace video' });
    expect(preview).toBeInTheDocument();
    // remove clears the reel back to the dropzone
    await user.click(screen.getByRole('button', { name: 'Remove reel' }));
    expect(screen.getByText(/No reel yet/)).toBeInTheDocument();
  });

  it('renders the preview immediately when a value is preset', () => {
    const { container } = render(<Controlled initial="https://a.com/have.mp4" />);
    expect(container.querySelector('video')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Remove reel' })).toBeInTheDocument();
  });

  it('ignores a cancelled pick (null url)', async () => {
    const user = userEvent.setup();
    const onPickVideo = vi.fn().mockResolvedValue(null);
    render(<Controlled onPickVideo={onPickVideo} />);
    await user.click(screen.getByRole('button', { name: 'Pick video' }));
    expect(onPickVideo).toHaveBeenCalled();
    expect(screen.getByText(/No reel yet/)).toBeInTheDocument();
  });
});
