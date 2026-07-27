import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SliderMediaField from '../../src/pages/settings/pod-shop-slider/SliderMediaField';
import type { SliderMedia } from '../../src/pages/settings/pod-shop-slider/queries';

const media = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('../../src/components/MediaPickerDialog', () => ({
  default: (props: Record<string, any>) => {
    media.props = props;
    return props.open ? <div data-testid="picker" data-folder={props.folder} /> : null;
  },
}));

const image: SliderMedia = { url: 'https://cdn.test/a.jpg', type: 'IMAGE' };
const video: SliderMedia = { url: 'https://cdn.test/b.mp4', type: 'VIDEO' };
const third: SliderMedia = { url: 'https://cdn.test/c.jpg', type: 'IMAGE' };

describe('SliderMediaField', () => {
  it('shows the empty state and opens the picker on "Add media"', () => {
    render(<SliderMediaField media={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/No slider media yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add media/i }));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-folder', '/pod-shop-slider');
  });

  it('appends a picked image as an IMAGE slide', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[]} onChange={onChange} />);
    act(() => media.props?.onPicked('https://cdn.test/new.png'));
    expect(onChange).toHaveBeenCalledWith([{ url: 'https://cdn.test/new.png', type: 'IMAGE' }]);
  });

  it('classifies a picked video URL as a VIDEO slide and keeps the existing order', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image]} onChange={onChange} />);
    act(() => media.props?.onPicked('https://cdn.test/clip.mp4?v=2'));
    expect(onChange).toHaveBeenCalledWith([
      image,
      { url: 'https://cdn.test/clip.mp4?v=2', type: 'VIDEO' },
    ]);
  });

  it('ignores a duplicate URL but still closes the picker', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add media/i }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();

    act(() => media.props?.onPicked(image.url));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('closes the picker when the dialog asks to close', () => {
    render(<SliderMediaField media={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /add media/i }));
    act(() => media.props?.onClose());
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('previews an image slide with <img> and a video slide with <video>', () => {
    const { container } = render(
      <SliderMediaField media={[image, video]} onChange={vi.fn()} />,
    );
    expect(screen.getByAltText('slide')).toHaveAttribute('src', image.url);
    expect(container.querySelector('video')).toHaveAttribute('src', video.url);
    expect(screen.getByText(`IMAGE · ${image.url}`)).toBeInTheDocument();
    expect(screen.getByText(`VIDEO · ${video.url}`)).toBeInTheDocument();
    expect(screen.queryByText(/No slider media yet/i)).not.toBeInTheDocument();
  });

  it('disables "Move up" on the first slide and "Move down" on the last', () => {
    render(<SliderMediaField media={[image, video]} onChange={vi.fn()} />);
    const up = screen.getAllByRole('button', { name: 'Move up' });
    const down = screen.getAllByRole('button', { name: 'Move down' });
    expect(up[0]).toBeDisabled();
    expect(up[1]).toBeEnabled();
    expect(down[0]).toBeEnabled();
    expect(down[1]).toBeDisabled();
  });

  it('swaps two slides when moving one up', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image, video]} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move up' })[1]);
    expect(onChange).toHaveBeenCalledWith([video, image]);
  });

  it('swaps two slides when moving one down', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image, video]} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(onChange).toHaveBeenCalledWith([video, image]);
  });

  it('drops only the removed slide', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image, video]} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onChange).toHaveBeenCalledWith([video]);
  });

  it('renders blank copy inputs when a slide carries no text', () => {
    render(<SliderMediaField media={[image]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Heading')).toHaveValue('');
    expect(screen.getByLabelText('Subheading')).toHaveValue('');
    expect(screen.getByLabelText('CTA label')).toHaveValue('');
    expect(screen.getByLabelText('CTA link (URL or /path)')).toHaveValue('');
  });

  it('shows the copy already stored on a slide', () => {
    const filled: SliderMedia = {
      ...image,
      heading: 'Gear Up',
      subheading: 'Top picks',
      cta_label: 'Shop',
      cta_url: '/shop',
    };
    render(<SliderMediaField media={[filled]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Heading')).toHaveValue('Gear Up');
    expect(screen.getByLabelText('Subheading')).toHaveValue('Top picks');
    expect(screen.getByLabelText('CTA label')).toHaveValue('Shop');
    expect(screen.getByLabelText('CTA link (URL or /path)')).toHaveValue('/shop');
  });

  // A slider list can go stale under the field: the branding query refetches, or
  // the same singleton is edited elsewhere, and the row the admin is touching no
  // longer exists. The field must drop that edit rather than emit a list with a
  // hole in it, which would be saved back to the Branding singleton.
  it('emits nothing when a slide is edited after it vanished from the list', () => {
    const onChange = vi.fn();
    const list: SliderMedia[] = [image, video];
    render(<SliderMediaField media={list} onChange={onChange} />);
    list.length = 1; // the second slide is gone; the rendered row is now stale

    fireEvent.change(screen.getAllByLabelText('Heading')[1], { target: { value: 'H' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits nothing when a reorder would land past the end of a shrunken list', () => {
    const onChange = vi.fn();
    const list: SliderMedia[] = [image, video, third];
    render(<SliderMediaField media={list} onChange={onChange} />);
    list.length = 2; // the last slide is gone, so row 1 is now the final row

    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[1]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits nothing when a reorder targets a gap in the list', () => {
    const onChange = vi.fn();
    const gapped: SliderMedia[] = [];
    gapped[0] = image;
    gapped.length = 2; // index 1 is a hole — a partially-written slider payload

    render(<SliderMediaField media={gapped} onChange={onChange} />);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('patches the edited slide only, leaving its siblings untouched', () => {
    const onChange = vi.fn();
    render(<SliderMediaField media={[image, video]} onChange={onChange} />);

    fireEvent.change(screen.getAllByLabelText('Heading')[1], { target: { value: 'H' } });
    expect(onChange).toHaveBeenLastCalledWith([image, { ...video, heading: 'H' }]);

    fireEvent.change(screen.getAllByLabelText('Subheading')[0], { target: { value: 'S' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...image, subheading: 'S' }, video]);

    fireEvent.change(screen.getAllByLabelText('CTA label')[0], { target: { value: 'Buy' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...image, cta_label: 'Buy' }, video]);

    fireEvent.change(screen.getAllByLabelText('CTA link (URL or /path)')[0], {
      target: { value: '/shop' },
    });
    expect(onChange).toHaveBeenLastCalledWith([{ ...image, cta_url: '/shop' }, video]);
  });
});
