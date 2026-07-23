import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import MediaField from '../../src/components/MediaField';

function Controlled({
  initial = '',
  onPickImage,
}: Readonly<{ initial?: string; onPickImage?: () => Promise<string | null> }>) {
  const [value, setValue] = useState(initial);
  return (
    <MediaField label="Images" value={value} onChange={setValue} onPickImage={onPickImage} error={undefined} />
  );
}

describe('MediaField (textarea mode)', () => {
  it('renders a multiline textarea and edits the raw value', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByLabelText('Images');
    await user.type(input, 'https://a.com/x.jpg');
    expect(input).toHaveValue('https://a.com/x.jpg');
  });

  it('shows the error over the helper text', () => {
    render(<MediaField label="Images" value="" onChange={vi.fn()} error="Need an image" />);
    expect(screen.getByText('Need an image')).toBeInTheDocument();
  });
});

describe('MediaField (rich picker mode)', () => {
  it('shows the empty placeholder when there are no items', () => {
    render(<Controlled onPickImage={vi.fn().mockResolvedValue(null)} />);
    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
  });

  it('shows an error caption in rich mode', () => {
    render(
      <MediaField label="Images" value="" onChange={vi.fn()} onPickImage={vi.fn()} error="Need an image" />,
    );
    expect(screen.getByText('Need an image')).toBeInTheDocument();
  });

  it('shows a helper caption in rich mode when there is no error', () => {
    render(
      <MediaField
        label="Images"
        value=""
        onChange={vi.fn()}
        onPickImage={vi.fn()}
        helperText="Cover first"
      />,
    );
    expect(screen.getByText('Cover first')).toBeInTheDocument();
  });

  it('renders a required asterisk after the label when required', () => {
    render(<MediaField label="Images" value="" onChange={vi.fn()} onPickImage={vi.fn()} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('omits the required asterisk when not required', () => {
    render(<MediaField label="Images" value="" onChange={vi.fn()} onPickImage={vi.fn()} />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('appends a picked image via Add image', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue('https://a.com/new.jpg');
    render(<Controlled onPickImage={onPickImage} />);
    await user.click(screen.getByRole('button', { name: 'Add image' }));
    expect(await screen.findByText('https://a.com/new.jpg')).toBeInTheDocument();
  });

  it('ignores a cancelled pick (null url)', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue(null);
    render(<Controlled onPickImage={onPickImage} />);
    await user.click(screen.getByRole('button', { name: 'Add image' }));
    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
  });

  it('replaces an existing row via the row replace control', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue('https://a.com/replaced.jpg');
    render(<Controlled initial={'https://a.com/one.jpg'} onPickImage={onPickImage} />);
    await user.click(screen.getByRole('button', { name: 'Replace' }));
    expect(await screen.findByText('https://a.com/replaced.jpg')).toBeInTheDocument();
  });

  it('moves and removes rows', async () => {
    const user = userEvent.setup();
    const onPickImage = vi.fn().mockResolvedValue(null);
    render(<Controlled initial={'https://a.com/one.jpg\nhttps://a.com/two.jpg'} onPickImage={onPickImage} />);
    // move the first row down: order becomes two, one
    await user.click(screen.getAllByTestId('ArrowDownwardIcon')[0].closest('button') as HTMLButtonElement);
    const rows = screen.getAllByText(/https:\/\/a\.com/);
    expect(rows[0]).toHaveTextContent('two.jpg');
    // remove the first row
    await user.click(screen.getAllByTestId('DeleteIcon')[0].closest('button') as HTMLButtonElement);
    expect(screen.queryByText('https://a.com/two.jpg')).not.toBeInTheDocument();
  });

  it('disables moving a single row past the list boundary', () => {
    const onChange = vi.fn();
    render(
      <MediaField
        label="Images"
        value={'https://a.com/one.jpg'}
        onChange={onChange}
        onPickImage={vi.fn()}
      />,
    );
    // single row: both reorder buttons are disabled
    expect(screen.getByTestId('ArrowUpwardIcon').closest('button')).toBeDisabled();
    expect(screen.getByTestId('ArrowDownwardIcon').closest('button')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
