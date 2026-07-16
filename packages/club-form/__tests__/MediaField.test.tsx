import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaField from '../src/components/MediaField';

const addBtn = () => screen.getByRole('button', { name: 'Add image' });

describe('MediaField — textarea fallback (no onPickImage)', () => {
  it('renders a textarea and forwards typed text via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MediaField label="Feature media" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Feature media');
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith('x');
    expect(screen.getByText('One image or video URL per line.')).toBeInTheDocument();
  });

  it('shows the error text in preference to the helper text', () => {
    render(<MediaField label="Feature media" value="" onChange={vi.fn()} error="Required" helperText="hint" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('falls back to the helper text when there is no error', () => {
    render(<MediaField label="Feature media" value="" onChange={vi.fn()} helperText="hint text" />);
    expect(screen.getByText('hint text')).toBeInTheDocument();
  });
});

describe('MediaField — picker mode (with onPickImage)', () => {
  it('shows the empty state and helper caption when there are no items', () => {
    render(<MediaField label="Media" value="" onChange={vi.fn()} onPickImage={vi.fn()} helperText="cap" />);
    expect(screen.getByText('cap')).toBeInTheDocument();
    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
  });

  it('shows the error caption in preference to the helper text', () => {
    render(
      <MediaField label="Media" value="https://x/a.jpg" onChange={vi.fn()} onPickImage={vi.fn()} error="bad" helperText="cap" />,
    );
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('renders no caption block when neither error nor helper is set', () => {
    render(<MediaField label="Media" value="https://x/a.jpg" onChange={vi.fn()} onPickImage={vi.fn()} />);
    expect(screen.queryByText('cap')).not.toBeInTheDocument();
  });

  it('appends a picked URL to an empty list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPickImage = vi.fn().mockResolvedValue('https://x/new.jpg');
    render(<MediaField label="Media" value="" onChange={onChange} onPickImage={onPickImage} folder="/clubs" />);
    await user.click(addBtn());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://x/new.jpg'));
    expect(onPickImage).toHaveBeenCalledWith('/clubs');
  });

  it('appends to a non-empty list keeping existing items', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPickImage = vi.fn().mockResolvedValue('https://x/new.jpg');
    render(<MediaField label="Media" value="https://x/a.jpg" onChange={onChange} onPickImage={onPickImage} />);
    await user.click(addBtn());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://x/a.jpg\nhttps://x/new.jpg'));
  });

  it('ignores a null pick result (no onChange)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPickImage = vi.fn().mockResolvedValue(null);
    render(<MediaField label="Media" value="" onChange={onChange} onPickImage={onPickImage} />);
    await user.click(addBtn());
    await waitFor(() => expect(onPickImage).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('swallows a rejected pick', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPickImage = vi.fn().mockRejectedValue(new Error('nope'));
    render(<MediaField label="Media" value="" onChange={onChange} onPickImage={onPickImage} />);
    await user.click(addBtn());
    await waitFor(() => expect(onPickImage).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('replaces the URL at a row via the replace control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPickImage = vi.fn().mockResolvedValue('https://x/replaced.jpg');
    render(
      <MediaField label="Media" value={'https://x/a.jpg\nhttps://x/b.jpg'} onChange={onChange} onPickImage={onPickImage} />,
    );
    await user.click(screen.getAllByTestId('ImageIcon')[0].closest('button') as HTMLButtonElement);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://x/replaced.jpg\nhttps://x/b.jpg'));
  });

  it('reorders items and no-ops at the boundary', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MediaField label="Media" value={'https://x/a.jpg\nhttps://x/b.jpg'} onChange={onChange} onPickImage={vi.fn()} />,
    );
    // First row move-up is disabled (boundary path never fires onChange).
    const upButtons = screen.getAllByTestId('ArrowUpwardIcon').map((i) => i.closest('button') as HTMLButtonElement);
    expect(upButtons[0]).toBeDisabled();
    // Move the first row down -> swaps a and b.
    const downButtons = screen.getAllByTestId('ArrowDownwardIcon').map((i) => i.closest('button') as HTMLButtonElement);
    await user.click(downButtons[0]);
    expect(onChange).toHaveBeenCalledWith('https://x/b.jpg\nhttps://x/a.jpg');
  });

  it('removes a row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MediaField label="Media" value={'https://x/a.jpg\nhttps://x/b.jpg'} onChange={onChange} onPickImage={vi.fn()} />,
    );
    const delButtons = screen.getAllByTestId('DeleteIcon').map((i) => i.closest('button') as HTMLButtonElement);
    await user.click(delButtons[0]);
    expect(onChange).toHaveBeenCalledWith('https://x/b.jpg');
  });
});
