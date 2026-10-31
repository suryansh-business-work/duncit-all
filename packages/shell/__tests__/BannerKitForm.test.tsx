/**
 * The banner kit form — a venue's or a host's — with its live slide preview.
 * What matters: it opens on what the API answered, the photo lists add,
 * caption, reorder, remove and take the suggested photos within their limit,
 * a host also gets past-event photos, the preview follows the typing, and a
 * save sends exactly the edited kit or shows why it was refused.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

interface UploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadTestId: string;
}
interface PickerProps {
  open: boolean;
  max: number;
  folder: string;
  onClose: () => void;
  onPicked: (url: string) => void;
  onPickedMany: (urls: string[]) => void;
}

// The ImageKit uploader and the picker are exercised in @duncit/media-picker;
// here they only hand URLs back the way the real ones do.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({ label, value, onChange, uploadTestId }: UploadFieldProps) => (
    <button type="button" data-testid={uploadTestId} onClick={() => onChange('https://ik.imagekit.io/duncit/new-logo.png')}>
      {label}: {value}
    </button>
  ),
  MediaPickerDialog: ({ open, max, folder, onClose, onPicked, onPickedMany }: PickerProps) =>
    open ? (
      <div data-testid="picker" data-max={max} data-folder={folder}>
        <button type="button" onClick={() => onPicked('https://ik.imagekit.io/duncit/one.jpg')}>pick one</button>
        <button
          type="button"
          onClick={() => onPickedMany(Array.from({ length: 15 }, (_, i) => `https://ik.imagekit.io/duncit/many-${i}.jpg`))}
        >
          pick many
        </button>
        <button type="button" onClick={onClose}>close picker</button>
      </div>
    ) : null,
}));

import { BannerKitForm, type BannerKitData } from '../src/banner-kit/banner-kit-form';

const CDN = 'https://ik.imagekit.io/duncit';
const kit = (over: Partial<BannerKitData> = {}): BannerKitData => ({
  logo_url: `${CDN}/logo.png`,
  instagram_handle: 'cafe.blue',
  collab_opt_in: true,
  photos: [
    { url: `${CDN}/a.jpg`, caption: 'Rooftop' },
    { url: `${CDN}/b.jpg`, caption: 'Bar' },
  ],
  event_photos: [],
  tagline: 'Games every Friday',
  bio: '',
  brand_color: '#123456',
  suggested_photos: [`${CDN}/s1.jpg`, `${CDN}/s2.jpg`],
  ...over,
});

function renderForm(entity: 'VENUE' | 'HOST' = 'VENUE', data = kit(), onSave = vi.fn().mockResolvedValue(undefined)) {
  const view = render(<BannerKitForm entity={entity} entityId="v1" name="Blue Door" kit={data} onSave={onSave} />);
  return { ...view, onSave };
}

const save = () => fireEvent.click(screen.getByTestId('banner-kit-save'));
const preview = () => screen.getByTestId('banner-kit-preview');
const captions = (list: string) =>
  within(screen.getByTestId(`banner-kit-${list}`))
    .queryAllByLabelText('Caption')
    .map((input) => (input instanceof HTMLInputElement ? input.value : null));

describe('BannerKitForm', () => {
  it('opens on the saved kit and saves it unchanged', async () => {
    const { onSave } = renderForm();
    expect(screen.getByTestId('banner-kit-instagram')).toHaveValue('cafe.blue');
    expect(screen.getByTestId('banner-kit-tagline')).toHaveValue('Games every Friday');
    expect(screen.getByRole('checkbox', { name: 'Allow collab posts' })).toBeChecked();
    expect(captions('photos')).toEqual(['Rooftop', 'Bar']);
    expect(screen.getByText('2 of 12')).toBeInTheDocument();
    // A venue has no past-event photos.
    expect(screen.queryByTestId('banner-kit-event_photos')).not.toBeInTheDocument();
    expect(within(preview()).getByText('The venue')).toBeInTheDocument();

    save();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      logo_url: `${CDN}/logo.png`,
      instagram_handle: 'cafe.blue',
      collab_opt_in: true,
      photos: [
        { url: `${CDN}/a.jpg`, caption: 'Rooftop' },
        { url: `${CDN}/b.jpg`, caption: 'Bar' },
      ],
      event_photos: [],
      tagline: 'Games every Friday',
      bio: '',
      brand_color: '#123456',
    });
  });

  it('sends what was edited: a new logo, the collab switch off, a bio and a cleared colour', async () => {
    const { onSave } = renderForm();
    fireEvent.click(screen.getByTestId('banner-kit-logo-upload'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow collab posts' }));
    await userEvent.type(screen.getByTestId('banner-kit-bio'), 'Since 2019.');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ logo_url: `${CDN}/new-logo.png`, collab_opt_in: false, bio: 'Since 2019.', brand_color: '' }),
      ),
    );
  });

  it('reorders, captions and removes photos', async () => {
    const { onSave } = renderForm();
    expect(screen.getByRole('button', { name: 'Move photo 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move photo 2 down' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Move photo 1 down' }));
    expect(captions('photos')).toEqual(['Bar', 'Rooftop']);
    fireEvent.click(screen.getByRole('button', { name: 'Move photo 2 up' }));
    expect(captions('photos')).toEqual(['Rooftop', 'Bar']);

    const first = screen.getByTestId('banner-kit-photos-caption-0');
    await userEvent.clear(first);
    await userEvent.type(first, 'The terrace');
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
    expect(screen.getByAltText('Photo 1')).toHaveAttribute('src', `${CDN}/a.jpg`);

    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ photos: [{ url: `${CDN}/a.jpg`, caption: 'The terrace' }] })),
    );
  });

  it('adds picked photos up to the limit and fills the list from the suggestions', () => {
    renderForm('VENUE', kit({ photos: [] }));
    expect(screen.getByText('No photos yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('banner-kit-photos-add'));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-max', '12');
    expect(screen.getByTestId('picker')).toHaveAttribute('data-folder', '/venues');
    fireEvent.click(screen.getByRole('button', { name: 'pick one' }));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    expect(captions('photos')).toHaveLength(1);

    // Fifteen picked, eleven fit.
    fireEvent.click(screen.getByTestId('banner-kit-photos-add'));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-max', '11');
    fireEvent.click(screen.getByRole('button', { name: 'pick many' }));
    expect(captions('photos')).toHaveLength(12);
    expect(screen.getByTestId('banner-kit-photos-add')).toBeDisabled();

    fireEvent.click(screen.getByTestId('banner-kit-photos-suggested'));
    expect(captions('photos')).toEqual(['', '']);
    expect(screen.getByAltText('Photo 2')).toHaveAttribute('src', `${CDN}/s2.jpg`);
  });

  it('closes the picker without adding anything', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('banner-kit-photos-add'));
    fireEvent.click(screen.getByRole('button', { name: 'close picker' }));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    expect(captions('photos')).toHaveLength(2);
  });

  it("gives a host portraits and past-event photos, filed in the host's folder, with no suggestions for events", () => {
    renderForm('HOST', kit({ event_photos: [{ url: `${CDN}/quiz.jpg`, caption: 'Quiz night' }], suggested_photos: [] }));
    expect(screen.getByText('Your photos')).toBeInTheDocument();
    expect(captions('event_photos')).toEqual(['Quiz night']);
    expect(screen.queryByTestId('banner-kit-photos-suggested')).not.toBeInTheDocument();
    expect(screen.queryByTestId('banner-kit-event_photos-suggested')).not.toBeInTheDocument();
    expect(within(preview()).getByText('Meet your host')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('banner-kit-event_photos-add'));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-folder', '/hosts/photo');
  });

  it('draws the preview from what is typed, and the theme colour for no colour or a half-typed one', async () => {
    renderForm('VENUE', kit({ photos: [], logo_url: '', tagline: '' }));
    const handle = screen.getByTestId('banner-kit-instagram');
    await userEvent.clear(handle);
    await userEvent.type(handle, 'https://instagram.com/Blue.Door/');
    expect(within(preview()).getByText('@blue.door')).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('banner-kit-tagline'), 'Come as you are');
    expect(within(preview()).getByText('Come as you are')).toBeInTheDocument();
    // The initial of the name stands in for a missing logo.
    expect(within(preview()).getByText('B')).toBeInTheDocument();

    const color = screen.getByTestId('banner-kit-color');
    await userEvent.clear(color);
    await userEvent.type(color, '#12');
    expect(within(preview()).getByText('Blue Door')).toBeInTheDocument();
    await userEvent.clear(handle);
    expect(within(preview()).queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('refuses a malformed handle and colour without saving', async () => {
    const { onSave } = renderForm();
    const handle = screen.getByTestId('banner-kit-instagram');
    await userEvent.clear(handle);
    await userEvent.type(handle, 'cafe blue');
    const color = screen.getByTestId('banner-kit-color');
    await userEvent.clear(color);
    await userEvent.type(color, 'red');
    save();
    expect(await screen.findByText('Enter the Instagram handle, for example duncit.events')).toBeInTheDocument();
    expect(screen.getByText('The brand colour must look like #1a2b3c')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the server refusal and keeps the edits, and says it is saving while it waits', async () => {
    let finish: (value?: unknown) => void = () => undefined;
    const onSave = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
      .mockRejectedValueOnce(new Error('Not your venue'));
    renderForm('VENUE', kit(), onSave);
    save();
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByTestId('banner-kit-save')).toHaveTextContent('Save'));

    save();
    expect(await screen.findByTestId('banner-kit-error')).toHaveTextContent('Not your venue');
    expect(screen.getByTestId('banner-kit-instagram')).toHaveValue('cafe.blue');
  });

  it('shows the stored kit again when a saved or refreshed one comes in', () => {
    const { rerender } = renderForm();
    rerender(
      <BannerKitForm entity="VENUE" entityId="v1" name="Blue Door" kit={kit({ tagline: 'Refreshed' })} onSave={vi.fn()} />,
    );
    expect(screen.getByTestId('banner-kit-tagline')).toHaveValue('Refreshed');
  });
});
