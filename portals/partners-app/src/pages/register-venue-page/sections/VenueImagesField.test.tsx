import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import VenueImagesField from './VenueImagesField';

const PICKED_URL = 'https://cdn.duncit.com/venues/picked.jpg';

// The real dialog uploads through ImageKit; what this field owns is what it
// does with the URL the dialog hands back, and closing it.
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    onPicked,
    onClose,
    title,
  }: Readonly<{ open: boolean; onPicked: (url: string) => void; onClose: () => void; title: string }>) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={() => onPicked(PICKED_URL)}>
          {`pick from ${title}`}
        </button>
        <button type="button" onClick={onClose}>
          {`close ${title}`}
        </button>
      </div>
    ) : null,
}));

afterEach(cleanup);

interface MountProps {
  coverImageUrl?: string;
  coverError?: string;
  gallery?: string[];
  disabled?: boolean;
}

const mount = ({ coverImageUrl = '', coverError, gallery = [], disabled }: MountProps = {}) => {
  const onCoverChange = vi.fn();
  const onGalleryChange = vi.fn();
  render(
    <VenueImagesField
      coverImageUrl={coverImageUrl}
      coverError={coverError}
      gallery={gallery}
      disabled={disabled}
      onCoverChange={onCoverChange}
      onGalleryChange={onGalleryChange}
    />
  );
  return { onCoverChange, onGalleryChange };
};

describe('VenueImagesField — cover image', () => {
  it('asks for a cover and hands the picked URL back, closing the picker', () => {
    const { onCoverChange } = mount();

    expect(screen.queryByRole('img', { name: 'Venue cover' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Upload cover image' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Upload cover image' }));

    expect(onCoverChange).toHaveBeenCalledWith(PICKED_URL);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('previews an existing cover and offers to change it', () => {
    mount({ coverImageUrl: 'https://cdn.duncit.com/venues/cover.jpg' });

    expect(screen.getByRole('img', { name: 'Venue cover' }).getAttribute('src')).toBe(
      'https://cdn.duncit.com/venues/cover.jpg'
    );
    expect(screen.getByRole('button', { name: 'Change cover image' })).toBeTruthy();
  });

  it('shows the cover validation message', () => {
    mount({ coverError: 'Upload a cover image' });

    expect(screen.getByText('Upload a cover image')).toBeTruthy();
  });

  it('closes the cover picker without changing anything', () => {
    const { onCoverChange } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Upload cover image' }));
    fireEvent.click(screen.getByRole('button', { name: 'close Upload cover image' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onCoverChange).not.toHaveBeenCalled();
  });
});

describe('VenueImagesField — gallery', () => {
  it('invites photos while the gallery is empty', () => {
    mount();

    expect(screen.getByText('Add venue photos for the public venue page.')).toBeTruthy();
  });

  it('appends a picked image once, even when it is already in the gallery', () => {
    const { onGalleryChange } = mount({ gallery: [PICKED_URL] });

    fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Add venue image' }));

    expect(onGalleryChange).toHaveBeenCalledWith([PICKED_URL]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('adds a new image after the existing ones', () => {
    const { onGalleryChange } = mount({ gallery: ['https://cdn.duncit.com/venues/1.jpg'] });

    fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick from Add venue image' }));

    expect(onGalleryChange).toHaveBeenCalledWith(['https://cdn.duncit.com/venues/1.jpg', PICKED_URL]);
  });

  it('removes the image whose delete button was pressed', () => {
    const { onGalleryChange } = mount({
      gallery: ['https://cdn.duncit.com/venues/1.jpg', 'https://cdn.duncit.com/venues/2.jpg'],
    });

    expect(screen.getAllByRole('img', { name: 'Venue gallery' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove image' })[1]);

    expect(onGalleryChange).toHaveBeenCalledWith(['https://cdn.duncit.com/venues/1.jpg']);
  });

  it('closes the gallery picker without adding anything', () => {
    const { onGalleryChange } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
    fireEvent.click(screen.getByRole('button', { name: 'close Add venue image' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onGalleryChange).not.toHaveBeenCalled();
  });

  it('disables every picker and remove button while locked', () => {
    mount({ gallery: ['https://cdn.duncit.com/venues/1.jpg'], disabled: true });

    expect(screen.getByRole('button', { name: 'Upload cover image' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Add image' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Remove image' })).toHaveProperty('disabled', true);
  });
});
