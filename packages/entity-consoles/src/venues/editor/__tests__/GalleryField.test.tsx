import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryField from '../fields/GalleryField';
import { blankVenueValues, type VenueFormValues } from '../types';
import { renderForm } from './harness';

/**
 * The venue's gallery — bare URLs, in the order the admin sees them.
 */
const FRONT = 'https://ik.imagekit.io/duncit/venues/front.jpg';
const TERRACE = 'https://ik.imagekit.io/duncit/venues/terrace.jpg';

const renderGallery = (gallery: string[] | undefined, onPick: () => Promise<string | null>) =>
  renderForm<VenueFormValues>({ ...blankVenueValues, gallery }, ({ control }) => (
    <GalleryField control={control} onPick={onPick} />
  ));

describe('GalleryField', () => {
  it('says the gallery is empty, then shows the photo an upload adds', async () => {
    const user = userEvent.setup();
    const { form } = renderGallery(undefined, vi.fn().mockResolvedValue(FRONT));

    expect(screen.getByText('No gallery photos yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a photo' }));

    expect(await screen.findByRole('img', { name: 'Venue photo' })).toHaveAttribute('src', FRONT);
    expect(screen.queryByText('No gallery photos yet.')).not.toBeInTheDocument();
    expect(form().getValues('gallery')).toEqual([FRONT]);
  });

  it('appends an upload after the existing photos', async () => {
    const user = userEvent.setup();
    const { form } = renderGallery([FRONT], vi.fn().mockResolvedValue(TERRACE));

    await user.click(screen.getByRole('button', { name: 'Add a photo' }));

    await waitFor(() => expect(form().getValues('gallery')).toEqual([FRONT, TERRACE]));
  });

  it('adds nothing when the dialog closes without a pick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn().mockResolvedValue(null);
    const { form } = renderGallery([FRONT], onPick);

    await user.click(screen.getByRole('button', { name: 'Add a photo' }));

    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    expect(form().getValues('gallery')).toEqual([FRONT]);
  });

  it('removes exactly the photo whose button was pressed', async () => {
    const user = userEvent.setup();
    const { form } = renderGallery([FRONT, TERRACE], vi.fn());

    expect(screen.getAllByRole('img', { name: 'Venue photo' })).toHaveLength(2);
    const [removeFront] = screen.getAllByRole('button', { name: 'Remove this photo' });
    await user.click(removeFront);

    expect(form().getValues('gallery')).toEqual([TERRACE]);
    expect(screen.getByRole('img', { name: 'Venue photo' })).toHaveAttribute('src', TERRACE);
  });
});
