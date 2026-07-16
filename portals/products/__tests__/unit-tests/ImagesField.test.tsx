import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import ImagesField from '../../src/pages/inventory-page/inventory-product-page/ImagesField';

const media = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/components/MediaPickerDialog', () => ({
  default: (props: Record<string, any>) => {
    media.props = props;
    return props.open ? <div data-testid="picker" /> : null;
  },
}));

describe('ImagesField', () => {
  it('shows the empty state and opens the picker', () => {
    render(<ImagesField images={[]} coverUrl="" onChange={vi.fn()} />);
    expect(screen.getByText(/No images yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add image/i }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('adds a picked image and makes it the cover when there is none', () => {
    const onChange = vi.fn();
    render(<ImagesField images={[]} coverUrl="" onChange={onChange} />);
    media.props?.onPicked('a.jpg');
    expect(onChange).toHaveBeenCalledWith(['a.jpg'], 'a.jpg');
  });

  it('keeps the existing cover and dedupes when adding another image', () => {
    const onChange = vi.fn();
    render(<ImagesField images={['a.jpg']} coverUrl="a.jpg" onChange={onChange} />);
    media.props?.onPicked('a.jpg'); // duplicate
    expect(onChange).toHaveBeenCalledWith(['a.jpg'], 'a.jpg');
  });

  it('renders a gallery, marks the cover and lets you set another cover', () => {
    const onChange = vi.fn();
    render(<ImagesField images={['a.jpg', 'b.jpg']} coverUrl="a.jpg" onChange={onChange} />);
    // Two "Set as cover"/"Cover image" star buttons + two remove buttons.
    fireEvent.click(screen.getByRole('button', { name: /Set as cover/i }));
    expect(onChange).toHaveBeenCalledWith(['a.jpg', 'b.jpg'], 'b.jpg');
  });

  it('removes an image and promotes the next one to cover', () => {
    const onChange = vi.fn();
    render(<ImagesField images={['a.jpg', 'b.jpg']} coverUrl="a.jpg" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[0]);
    expect(onChange).toHaveBeenCalledWith(['b.jpg'], 'b.jpg');
  });

  it('keeps the cover when removing a non-cover image', () => {
    const onChange = vi.fn();
    render(<ImagesField images={['a.jpg', 'b.jpg']} coverUrl="a.jpg" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[1]);
    expect(onChange).toHaveBeenCalledWith(['a.jpg'], 'a.jpg');
  });

  it('clears the cover when the last image is removed', () => {
    const onChange = vi.fn();
    render(<ImagesField images={['a.jpg']} coverUrl="a.jpg" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    expect(onChange).toHaveBeenCalledWith([], '');
  });

  it('closes the picker via onClose', () => {
    render(<ImagesField images={[]} coverUrl="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /add image/i }));
    act(() => media.props?.onClose());
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });
});
