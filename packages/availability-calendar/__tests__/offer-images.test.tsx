import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemo } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/app-settings';
import { makeVenueOfferCounterSchema } from '@duncit/forms/schemas';
import OfferChatCard from '../src/offers/chat/OfferChatCard';
import type { CounterOfferValues } from '../src/offers/counter-offer';
import OfferImagesField from '../src/offers/counter-offer/OfferImagesField';
import OfferImages from '../src/offers/OfferImages';
import OfferTermsPanel from '../src/offers/OfferTermsPanel';
import { DEFAULT_PICK, nextPicks } from './media-picker-stub';
import { PHOTO_A, PHOTO_B, makeCounter, makeMove, makeOffer, withApollo } from './offer-fixtures';

vi.mock('@duncit/media-picker', async () => ({ MediaPickerDialog: (await import('./media-picker-stub')).MediaPickerStub }));

const PHOTO_C = 'https://ik.imagekit.io/duncit/chat/space.jpg';
const PHOTO_D = 'https://ik.imagekit.io/duncit/chat/stage.jpg';
const PHOTO_E = 'https://ik.imagekit.io/duncit/chat/bar.jpg';

const thumbnail = (n: number) => ({ name: `Photo ${n} attached to the terms` });

beforeEach(() => {
  nextPicks.length = 0;
});

describe('OfferImages', () => {
  it.each([null, undefined, []])('draws nothing without photos (%j)', (images) => {
    const { container } = render(<OfferImages images={images} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each photo as a thumbnail that opens full size over the chat and closes again', async () => {
    render(<OfferImages images={[PHOTO_A, PHOTO_B]} />);
    const strip = within(screen.getByTestId('offer-images'));
    expect(strip.getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_A);
    expect(strip.getByRole('img', thumbnail(2))).toHaveAttribute('src', PHOTO_B);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open photo 2' }));
    const viewer = within(screen.getByRole('dialog'));
    expect(viewer.getByRole('img', thumbnail(2))).toHaveAttribute('src', PHOTO_B);
    expect(viewer.queryByRole('img', thumbnail(1))).not.toBeInTheDocument();
    fireEvent.click(viewer.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the full-size photo with Escape too', async () => {
    render(<OfferImages images={[PHOTO_A]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo 1' }));
    const viewer = within(screen.getByRole('dialog'));
    expect(viewer.getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_A);
    fireEvent.keyDown(viewer.getByRole('button', { name: 'Close' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('the photos beside the terms', () => {
  it("shows the venue's counter's photos while it is on the table, not the host's", () => {
    const offer = makeOffer({ status: 'COUNTERED', awaiting: 'HOST', images: [PHOTO_A], counter: makeCounter({ images: [PHOTO_B] }) });
    withApollo([], <OfferTermsPanel offer={offer} podIsFree={false} />);
    const strip = within(screen.getByTestId('offer-images'));
    expect(strip.getAllByRole('img')).toHaveLength(1);
    expect(strip.getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_B);
  });

  it("shows the host's photos while their terms are on the table", () => {
    withApollo([], <OfferTermsPanel offer={makeOffer({ images: [PHOTO_A] })} podIsFree={false} side="HOST" />);
    expect(within(screen.getByTestId('offer-images')).getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_A);
  });

  it('shows none for a counter from a server that sends no photos', () => {
    const offer = makeOffer({ status: 'COUNTERED', awaiting: 'HOST', images: [PHOTO_A], counter: makeCounter({ images: undefined }) });
    withApollo([], <OfferTermsPanel offer={offer} podIsFree={false} />);
    expect(screen.queryByTestId('offer-images')).not.toBeInTheDocument();
  });

  it('shows the photos a move carried on its chat card', () => {
    withApollo([], <OfferChatCard move={makeMove({ event: 'COUNTER', by: 'VENUE', round: 2, images: [PHOTO_A, PHOTO_B] })} viewer="STAFF" newest={false} />);
    const strip = within(screen.getByTestId('offer-images'));
    expect(strip.getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_A);
    expect(strip.getByRole('img', thumbnail(2))).toHaveAttribute('src', PHOTO_B);
  });
});

/** The counter form's photos field, under the counter's own rules. */
function PhotosForm({ images, onSubmit }: Readonly<{ images?: string[]; onSubmit: (values: CounterOfferValues) => void }>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOfferCounterSchema(t, 20), [t]);
  const terms = { model: 'FLAT' as const, rate: '7000', min_guests: '', offerings: '', note: '' };
  const { control, handleSubmit } = useForm<CounterOfferValues>({
    resolver: zodResolver(schema),
    defaultValues: images ? { ...terms, images } : terms,
  });
  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <OfferImagesField control={control} />
      <button type="submit">Send</button>
    </form>
  );
}

const renderPhotos = (images?: string[]) => {
  const onSubmit = vi.fn();
  render(<PhotosForm images={images} onSubmit={onSubmit} />);
  return { onSubmit, field: within(screen.getByTestId('offer-images-field')) };
};

const pick = (field: ReturnType<typeof renderPhotos>['field'], url?: string) => {
  if (url) nextPicks.push(url);
  fireEvent.click(field.getByRole('button', { name: 'Add photo' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Attach a photo' })).getByRole('button', { name: 'Pick photo' }));
};

describe('OfferImagesField', () => {
  it('names the field and its bound, and attaches each photo picked, in order', async () => {
    const { field, onSubmit } = renderPhotos([]);
    expect(field.getByText('Photos (optional)')).toBeInTheDocument();
    expect(field.getByText('Up to 4 photos from your device, for example the set-up or the menu.')).toBeInTheDocument();
    pick(field, PHOTO_A);
    pick(field, PHOTO_B);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(field.getByRole('img', thumbnail(1))).toHaveAttribute('src', PHOTO_A);
    expect(field.getByRole('img', thumbnail(2))).toHaveAttribute('src', PHOTO_B);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].images).toEqual([PHOTO_A, PHOTO_B]);
  });

  it('takes back the photo removed and keeps the rest', async () => {
    const { field, onSubmit } = renderPhotos([PHOTO_A, PHOTO_B, PHOTO_C]);
    fireEvent.click(field.getByRole('button', { name: 'Remove photo 2' }));
    expect(field.getAllByRole('img').map((img) => img.getAttribute('src'))).toEqual([PHOTO_A, PHOTO_C]);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].images).toEqual([PHOTO_A, PHOTO_C]);
  });

  it('holds a photo once: picking it again moves it to the end', () => {
    const { field } = renderPhotos([PHOTO_A, PHOTO_B]);
    pick(field, PHOTO_A);
    expect(field.getAllByRole('img').map((img) => img.getAttribute('src'))).toEqual([PHOTO_B, PHOTO_A]);
  });

  it('offers no more once four are attached', () => {
    const { field } = renderPhotos([PHOTO_A, PHOTO_B, PHOTO_C, PHOTO_D]);
    expect(field.getAllByRole('img')).toHaveLength(4);
    expect(field.queryByRole('button', { name: 'Add photo' })).not.toBeInTheDocument();
    fireEvent.click(field.getByRole('button', { name: 'Remove photo 4' }));
    expect(field.getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
  });

  it('attaches nothing when the picker is closed without a pick', () => {
    const { field } = renderPhotos([]);
    fireEvent.click(field.getByRole('button', { name: 'Add photo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Attach a photo' })).getByRole('button', { name: 'Close picker' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(field.queryByRole('img')).not.toBeInTheDocument();
  });

  it("shows the rule's message in place of the hint when more than four are attached", async () => {
    const { field, onSubmit } = renderPhotos([PHOTO_A, PHOTO_B, PHOTO_C, PHOTO_D, PHOTO_E]);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await field.findByText('Attach at most 4 photos')).toBeInTheDocument();
    expect(field.queryByText(/^Up to 4 photos/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reads a form that has no photos yet as none, and starts the list with the first pick', () => {
    const { field } = renderPhotos();
    expect(field.queryByRole('img')).not.toBeInTheDocument();
    pick(field);
    expect(field.getByRole('img', thumbnail(1))).toHaveAttribute('src', DEFAULT_PICK);
  });
});
