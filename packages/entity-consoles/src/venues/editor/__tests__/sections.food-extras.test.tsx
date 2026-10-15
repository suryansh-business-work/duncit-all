import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { blankFoodDish, FOOD_CURRENCY_QUERY, VENUE_TABLE_STICKERS_QUERY } from '@duncit/utils';
import FoodSection from '../sections/FoodSection';
import VenueDetailsSection from '../sections/VenueDetailsSection';
import type { VenueFormValues } from '../types';
import { catalogueMocks, registrationConfig } from './catalogues';
import { renderForm } from './harness';
import { sectionCard, venueValues } from './sectionKit';

/**
 * What the venue editor gained with the shared food fields: the FSSAI and
 * liquor licences, the tables and their QR stickers, a dish's videos and its
 * struck-through original price — and the venue's own videos in Venue Details.
 * Every one is the shared `@duncit/venue-food` field, driven here the way a
 * Venues console editor drives it.
 */

// The shared media picker as a stub: it records where it was told to file the
// upload, and picks one file. The picker itself has its own suites.
const picked = vi.hoisted((): { folder?: string; entityId?: string; accept?: string }[] => []);
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaPickerDialog: ({
    open,
    folder,
    entityId,
    accept,
    onPicked,
  }: {
    open: boolean;
    folder?: string;
    entityId?: string;
    accept?: string;
    onPicked: (url: string) => void;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => {
          picked.push({ folder, entityId, accept });
          onPicked(`https://cdn.example.test/upload-${picked.length}`);
        }}
      >
        Pick a stub file
      </button>
    ) : null,
}));

// The browser save-as is the one side effect the stickers button has.
const downloadBase64File = vi.hoisted(() => vi.fn());
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  downloadBase64File,
}));

const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';
const YOUTUBE_INVALID = 'Enter a YouTube video link (watch, shorts or youtu.be)';

const currencyMock: MockedResponse = {
  request: { query: gql(FOOD_CURRENCY_QUERY) },
  result: { data: { publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: '₹' } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const stickersMock = (result: MockedResponse['result'] | undefined, error?: Error): MockedResponse => ({
  request: {
    query: gql(VENUE_TABLE_STICKERS_QUERY),
    variables: { venueId: 'venue-1', headline: 'Scan to see the menu and order', tableHeading: 'Table' },
  },
  ...(error ? { error } : { result }),
});

const dish = (over: Partial<VenueFormValues['food_menu'][number]> = {}) => ({
  ...blankFoodDish(registrationConfig()),
  name: 'Masala dosa',
  price: 160,
  ...over,
});

beforeEach(() => {
  picked.length = 0;
  downloadBase64File.mockReset();
});

describe('FoodSection — licences', () => {
  const mount = () =>
    renderForm<VenueFormValues>(
      venueValues({ offers_food: true }),
      ({ control }) => <FoodSection control={control} config={registrationConfig()} venueId="venue-1" />,
      [currencyMock],
    );

  it('shows the licences only once the venue serves food', () => {
    renderForm<VenueFormValues>(venueValues(), ({ control }) => (
      <FoodSection control={control} config={registrationConfig()} venueId="venue-1" />
    ));
    expect(screen.queryByRole('textbox', { name: 'FSSAI licence number' })).not.toBeInTheDocument();
  });

  it('writes the FSSAI and liquor licence numbers into the form', () => {
    const { form } = mount();
    const section = within(sectionCard('food', 'Food Menu'));

    fireEvent.change(section.getByRole('textbox', { name: 'FSSAI licence number' }), {
      target: { value: '10020011000123' },
    });
    fireEvent.change(section.getByRole('textbox', { name: 'Liquor licence number (optional)' }), {
      target: { value: 'KA-BAR-77' },
    });

    expect(form().getValues('food_licences')).toMatchObject({
      fssai_number: '10020011000123',
      liquor_licence_number: 'KA-BAR-77',
    });
  });

  it("uploads a licence document into the venue's private papers folder, then views and removes it", async () => {
    const { form } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Upload FSSAI licence' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick a stub file' }));

    await waitFor(() => expect(form().getValues('food_licences.fssai_document_url')).toBe('https://cdn.example.test/upload-1'));
    expect(picked).toEqual([{ folder: '/venues/docs', entityId: 'venue-1', accept: 'application/pdf,image/*' }]);
    expect(screen.getByRole('link', { name: 'View FSSAI licence' })).toHaveAttribute('href', 'https://cdn.example.test/upload-1');
    // The other licence is still waiting for its document.
    expect(screen.getByRole('button', { name: 'Upload Liquor licence' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove FSSAI licence' }));
    expect(form().getValues('food_licences.fssai_document_url')).toBe('');
    expect(screen.getByRole('button', { name: 'Upload FSSAI licence' })).toBeInTheDocument();
  });
});

describe('FoodSection — tables and QR stickers', () => {
  const mount = (mocks: MockedResponse[] = [], hasSavedTables = true, venueId = 'venue-1') =>
    renderForm<VenueFormValues>(
      venueValues({ offers_food: true, food_tables: '1, 2' }),
      ({ control }) => (
        <FoodSection
          control={control}
          config={registrationConfig({ food_table_limit: 4 })}
          venueId={venueId}
          venueName="Third Wave Coffee"
          hasSavedTables={hasSavedTables}
        />
      ),
      [currencyMock, ...mocks],
    );
  const stickers = () => screen.getByRole('button', { name: 'Download QR stickers' });

  it('numbers the tables from a count, never past the venue limit', () => {
    const { form } = mount();
    const count = screen.getByRole('spinbutton', { name: 'Number of tables' });
    const fill = screen.getByRole('button', { name: 'Number them' });

    fireEvent.change(count, { target: { value: '3' } });
    fireEvent.click(fill);
    expect(form().getValues('food_tables')).toBe('1, 2, 3');

    fireEvent.change(count, { target: { value: '10' } });
    fireEvent.click(fill);
    expect(form().getValues('food_tables')).toBe('1, 2, 3, 4');
  });

  it('offers to number them only for a whole count above 0', () => {
    mount();
    const count = screen.getByRole('spinbutton', { name: 'Number of tables' });
    const fill = screen.getByRole('button', { name: 'Number them' });

    expect(fill).toBeDisabled();
    for (const value of ['0', '-2', '1.5']) {
      fireEvent.change(count, { target: { value } });
      expect(fill).toBeDisabled();
    }
  });

  it('takes the table names as typed', () => {
    const { form } = mount();
    const names = screen.getByRole('textbox', { name: 'Table names' });
    expect(names).toHaveValue('1, 2');

    fireEvent.change(names, { target: { value: '1, 2, Patio' } });
    expect(form().getValues('food_tables')).toBe('1, 2, Patio');
  });

  it('prints the stickers only for saved tables of a saved venue', () => {
    mount([], false);
    expect(stickers()).toBeDisabled();
    expect(screen.getByText('Add and save your tables to print their stickers.')).toBeInTheDocument();
  });

  it('cannot print before the venue is first saved, even with tables typed', () => {
    mount([], true, '');
    expect(stickers()).toBeDisabled();
  });

  it("downloads every table's sticker in one PDF named after the venue", async () => {
    mount([stickersMock({ data: { myVenueTableStickersPdfBase64: 'JVBERi0x' } })]);
    expect(screen.getByText('Save first — the stickers print the tables as saved.')).toBeInTheDocument();

    fireEvent.click(stickers());

    await waitFor(() =>
      expect(downloadBase64File).toHaveBeenCalledWith('JVBERi0x', 'third-wave-coffee-table-stickers.pdf', 'application/pdf'),
    );
    expect(screen.queryByTestId('venue-editor-food-table-stickers-error')).not.toBeInTheDocument();
  });

  it('says so when the server makes no PDF, and lets the message be closed', async () => {
    mount([stickersMock({ data: { myVenueTableStickersPdfBase64: null } })]);

    fireEvent.click(stickers());

    const alert = await screen.findByTestId('venue-editor-food-table-stickers-error');
    expect(alert).toHaveTextContent('We couldn’t make the stickers. Please try again.');
    expect(downloadBase64File).not.toHaveBeenCalled();

    fireEvent.click(within(alert).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByTestId('venue-editor-food-table-stickers-error')).not.toBeInTheDocument());
  });

  it('shows the failure on the page when the request fails', async () => {
    mount([stickersMock(undefined, new Error('Failed to fetch'))]);

    fireEvent.click(stickers());

    const alert = await screen.findByTestId('venue-editor-food-table-stickers-error');
    expect(alert.textContent).not.toBe('');
    expect(downloadBase64File).not.toHaveBeenCalled();
    expect(stickers()).toBeEnabled();
  });
});

describe('FoodSection — a dish’s price and videos', () => {
  const mount = (over: Partial<VenueFormValues['food_menu'][number]> = {}) =>
    renderForm<VenueFormValues>(
      venueValues({ offers_food: true, food_menu: [dish(over)] }),
      ({ control }) => <FoodSection control={control} config={registrationConfig({ food_video_limit: 2 })} venueId="venue-1" />,
      [currencyMock],
    );

  it('previews the struck-through original price and the saving the guest sees', async () => {
    mount({ original_price: 200 });

    expect(await screen.findByText('20% off')).toBeInTheDocument();
    expect(screen.getByText(/Guests see/)).toBeInTheDocument();
    expect(document.querySelector('s')).toHaveTextContent('200');
  });

  it('reads the saving as an amount when the owner chose that', async () => {
    mount({ original_price: 200, saving_display: 'AMOUNT' });

    expect(await screen.findByText(/40 off/)).toBeInTheDocument();
  });

  it('previews nothing without an original price above the price', () => {
    mount({ original_price: '' });
    expect(screen.queryByText(/Guests see/)).not.toBeInTheDocument();
  });

  it('writes the original price as typed', () => {
    const { form } = mount();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Original price (MRP)' }), { target: { value: '220' } });
    expect(form().getValues('food_menu.0.original_price')).toBe('220');
  });

  it('adds a YouTube link to the dish and clears the box', async () => {
    const { form } = mount();
    const link = screen.getByRole('textbox', { name: 'YouTube link' });

    fireEvent.change(link, { target: { value: `  ${YOUTUBE} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));

    await waitFor(() => expect(form().getValues('food_menu.0.videos')).toEqual([YOUTUBE]));
    expect(link).toHaveValue('');
    expect(screen.getByRole('link', { name: 'YouTube video 1' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(screen.getByText('Videos (1 of 2)')).toBeInTheDocument();
  });

  it('adds the link on Enter without submitting anything else', async () => {
    const { form } = mount();
    const link = screen.getByRole('textbox', { name: 'YouTube link' });

    fireEvent.change(link, { target: { value: YOUTUBE } });
    fireEvent.keyDown(link, { key: 'Enter' });

    await waitFor(() => expect(form().getValues('food_menu.0.videos')).toEqual([YOUTUBE]));
  });

  it('refuses a link that is not a YouTube video and adds nothing', async () => {
    const { form } = mount();

    fireEvent.change(screen.getByRole('textbox', { name: 'YouTube link' }), { target: { value: 'https://vimeo.com/123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));

    expect(await screen.findByText(YOUTUBE_INVALID)).toBeInTheDocument();
    expect(form().getValues('food_menu.0.videos')).toEqual([]);
  });

  it("uploads a clip into the venue's folder, and stops taking more at the limit", async () => {
    const { form } = mount({ videos: [YOUTUBE] });

    fireEvent.click(screen.getByRole('button', { name: 'Upload a video of Masala dosa' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick a stub file' }));

    await waitFor(() =>
      expect(form().getValues('food_menu.0.videos')).toEqual([YOUTUBE, 'https://cdn.example.test/upload-1']),
    );
    expect(picked).toEqual([{ folder: '/venues', entityId: 'venue-1', accept: 'video/*' }]);
    expect(screen.getByRole('link', { name: 'Uploaded video 2' })).toHaveAttribute('href', 'https://cdn.example.test/upload-1');
    // Two of two: no more uploads, no link box.
    expect(screen.getByRole('button', { name: 'Upload a video of Masala dosa' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'YouTube link' })).not.toBeInTheDocument();
  });

  it('removes one video and keeps the rest in order', () => {
    const { form } = mount({ videos: [YOUTUBE, 'https://cdn.example.test/clip.mp4'] });

    fireEvent.click(screen.getByRole('button', { name: 'Remove video 1' }));

    expect(form().getValues('food_menu.0.videos')).toEqual(['https://cdn.example.test/clip.mp4']);
    expect(screen.getByRole('textbox', { name: 'YouTube link' })).toBeInTheDocument();
  });

  it('names an unnamed dish on its upload button', () => {
    mount({ name: '  ' });
    expect(screen.getByRole('button', { name: 'Upload a video of this menu item' })).toBeInTheDocument();
  });
});

describe('VenueDetailsSection — the venue videos', () => {
  const mount = (over: Partial<VenueFormValues> = {}, venueId = 'venue-1', videoLimit = 2) =>
    renderForm<VenueFormValues>(
      venueValues(over),
      ({ control }) => (
        <VenueDetailsSection
          control={control}
          onPick={vi.fn()}
          categoryLimit={5}
          minCategories={0}
          venueId={venueId}
          videoLimit={videoLimit}
        />
      ),
      catalogueMocks,
    );

  it('holds the videos in Venue Details, counted against the config limit', () => {
    mount({ videos: [YOUTUBE] });
    const section = within(sectionCard('details', 'Venue Details'));

    expect(section.getByTestId('venue-editor-videos')).toBeInTheDocument();
    expect(section.getByText('Videos (1 of 2)')).toBeInTheDocument();
  });

  it("adds a YouTube link and an uploaded clip filed in the venue's folder", async () => {
    const { form } = mount();

    fireEvent.change(screen.getByRole('textbox', { name: 'YouTube link' }), { target: { value: YOUTUBE } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
    await waitFor(() => expect(form().getValues('videos')).toEqual([YOUTUBE]));

    fireEvent.click(screen.getByTestId('venue-editor-videos-upload'));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick a stub file' }));
    await waitFor(() => expect(form().getValues('videos')).toEqual([YOUTUBE, 'https://cdn.example.test/upload-1']));
    expect(picked).toEqual([{ folder: '/venues', entityId: 'venue-1', accept: 'video/*' }]);
  });

  it('files a new venue’s upload with no venue yet', async () => {
    mount({}, '');

    fireEvent.click(screen.getByTestId('venue-editor-videos-upload'));
    fireEvent.click(await screen.findByRole('button', { name: 'Pick a stub file' }));

    await waitFor(() => expect(picked).toEqual([{ folder: '/venues', entityId: undefined, accept: 'video/*' }]));
  });

  it('keeps the same link once, however often it is added', async () => {
    const { form } = mount({ videos: [YOUTUBE] }, 'venue-1', 3);

    fireEvent.change(screen.getByRole('textbox', { name: 'YouTube link' }), { target: { value: YOUTUBE } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'YouTube link' })).toHaveValue(''));
    expect(form().getValues('videos')).toEqual([YOUTUBE]);
  });

  it('takes no more at the limit', () => {
    mount({ videos: [YOUTUBE, 'https://cdn.example.test/clip.mp4'] });

    expect(screen.getByTestId('venue-editor-videos-upload')).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'YouTube link' })).not.toBeInTheDocument();
  });
});
