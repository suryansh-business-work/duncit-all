import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ImageTile, { type ImageTileAction } from '@/components/image-library/ImageTile';
import ImagePreviewDialog from '@/components/image-library/ImagePreviewDialog';
import ImageUploadButton from '@/components/image-library/ImageUploadButton';
import { imageMeta } from '@/components/image-library/imageMeta';

describe('imageMeta', () => {
  it('joins type, dimensions and size', () => {
    expect(imageMeta({ mime_type: 'image/png', width: 512, height: 256, size_bytes: 2048 })).toBe('PNG · 512×256 · 2 KB');
  });

  it('names an SVG without its +xml suffix', () => {
    expect(imageMeta({ mime_type: 'image/svg+xml', width: null, height: null, size_bytes: 900 })).toBe('SVG · 900 B');
  });

  it('leaves out whatever is unknown, including a single missing dimension', () => {
    expect(imageMeta({ mime_type: null, width: 512, height: null, size_bytes: null })).toBe('');
    expect(imageMeta({ width: 10, height: 20 })).toBe('10×20');
    expect(imageMeta({ size_bytes: 3 * 1024 * 1024 })).toBe('3.0 MB');
    expect(imageMeta({})).toBe('');
  });
});

describe('ImageTile', () => {
  const renderTile = (overrides: Partial<Parameters<typeof ImageTile>[0]> = {}) => {
    const onPreview = vi.fn();
    const rename = vi.fn();
    const remove = vi.fn();
    const actions: ImageTileAction[] = [
      { key: 'rename', label: 'Rename', icon: null, onClick: rename },
      { key: 'move', label: 'Move to Images', icon: null, onClick: vi.fn(), disabled: true },
      { key: 'delete', label: 'Delete', icon: null, onClick: remove, destructive: true },
    ];
    render(
      <ImageTile url="https://cdn.duncit.com/logo.png" name="Brand logo" meta="PNG · 1 KB" fit="contain" onPreview={onPreview} actions={actions} {...overrides} />,
    );
    return { onPreview, rename, remove };
  };

  it('shows the image, its name and details, and previews on click', () => {
    const { onPreview } = renderTile();
    expect(screen.getByRole('img', { name: 'Brand logo' })).toHaveAttribute('src', 'https://cdn.duncit.com/logo.png');
    expect(screen.getByText('PNG · 1 KB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Brand logo' }));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('opens the actions menu, runs the chosen action and closes the menu', async () => {
    const { rename, remove } = renderTile();
    const trigger = screen.getByRole('button', { name: 'Actions for Brand logo' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    const menu = within(await screen.findByRole('menu'));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(menu.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Rename', 'Move to Images', 'Delete']);
    expect(menu.getByRole('menuitem', { name: 'Move to Images' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(menu.getByRole('menuitem', { name: 'Rename' }));
    expect(rename).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('calls an unnamed image "Untitled image" and shows a badge when given one', () => {
    renderTile({ name: '', meta: undefined, badge: <span>Email logo</span> });
    expect(screen.getByRole('img', { name: 'Untitled image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for Untitled image' })).toBeInTheDocument();
    expect(screen.getByText('Email logo')).toBeInTheDocument();
    expect(screen.queryByText('PNG · 1 KB')).toBeNull();
  });
});

describe('ImagePreviewDialog', () => {
  it('stays closed without an image', () => {
    render(<ImagePreviewDialog image={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the image with its details and closes from the close button', () => {
    const onClose = vi.fn();
    render(<ImagePreviewDialog image={{ url: 'https://cdn.duncit.com/hall.jpg', name: 'Hall', meta: 'JPEG · 1 MB' }} onClose={onClose} />);

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Hall')).toBeInTheDocument();
    expect(dialog.getByText('JPEG · 1 MB')).toBeInTheDocument();
    expect(dialog.getByRole('img', { name: 'Hall' })).toHaveAttribute('src', 'https://cdn.duncit.com/hall.jpg');
    const original = dialog.getByRole('link', { name: 'Open original' });
    expect(original).toHaveAttribute('target', '_blank');
    expect(original).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('titles an unnamed image "Untitled image"', () => {
    render(<ImagePreviewDialog image={{ url: 'https://cdn.duncit.com/x.png', name: '' }} onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'Untitled image' })).toBeInTheDocument();
  });
});

describe('ImageUploadButton', () => {
  const png = new File(['x'], 'a.png', { type: 'image/png' });

  it('opens the file chooser for the accepted types and hands back the picked files', () => {
    const onFiles = vi.fn();
    render(<ImageUploadButton label="Upload logos" accept={['image/png', 'image/svg+xml']} onFiles={onFiles} testId="upload" />);
    const input = screen.getByTestId('upload') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/png,image/svg+xml');
    expect(input.multiple).toBe(true);

    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Upload logos' }));
    expect(click).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { files: [png] } });
    expect(onFiles).toHaveBeenCalledWith([png]);
  });

  it('ignores a chooser closed without a pick, and can be single-file', () => {
    const onFiles = vi.fn();
    render(<ImageUploadButton label="Upload" accept={['image/png']} multiple={false} onFiles={onFiles} testId="upload" />);
    const input = screen.getByTestId('upload') as HTMLInputElement;
    expect(input.multiple).toBe(false);

    fireEvent.change(input, { target: { files: [] } });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('is disabled when the group is full', () => {
    render(<ImageUploadButton label="Upload logos" accept={['image/png']} disabled onFiles={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Upload logos' })).toBeDisabled();
  });
});
