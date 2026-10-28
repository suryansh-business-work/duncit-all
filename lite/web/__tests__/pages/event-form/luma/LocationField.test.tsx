import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPlaces, mapsLink, resolvePlace, suggestPlaces } from '../../../../lib/googleMaps';
import { LocationField } from '../../../../pages/event-form/luma/LocationField';
import { failedLoad, fakePlaces, pickedFixture, renderInEventForm, suggestionFixture } from '../helpers';

vi.mock('../../../../lib/googleMaps', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/googleMaps')>()),
  loadPlaces: vi.fn(),
  suggestPlaces: vi.fn(),
  resolvePlace: vi.fn(),
}));

const CITIES = [
  { value: 'delhi', label: 'New Delhi' },
  { value: 'mumbai', label: 'Mumbai' },
];

const WITH_MAPS = { settings: { maps_api_key: 'maps-browser-key' } };
const BLANK_PLACE = { venue_name: '', address: '', map_url: '', city_slug: '' };

beforeEach(() => {
  vi.mocked(loadPlaces).mockResolvedValue(fakePlaces().lib);
  vi.mocked(suggestPlaces).mockResolvedValue([suggestionFixture()]);
  vi.mocked(resolvePlace).mockResolvedValue(pickedFixture({ city: 'new delhi' }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LocationField', () => {
  it('is a region named Where, in person by default', () => {
    renderInEventForm(<LocationField cities={CITIES} />);
    expect(screen.getByRole('region', { name: 'Where' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Location type' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In person' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('asks for the venue, address and map link by hand when no Maps key is set', () => {
    renderInEventForm(<LocationField cities={CITIES} />);
    expect(screen.getByRole('textbox', { name: 'Venue' })).toHaveValue('Skyline Terrace');
    expect(screen.getByRole('textbox', { name: 'Address' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Map link' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Venue or address' })).not.toBeInTheDocument();
    expect(loadPlaces).not.toHaveBeenCalled();
  });

  it('switches to the join link for an online event, and back', async () => {
    const { user, form } = renderInEventForm(<LocationField cities={CITIES} />);
    await user.click(screen.getByRole('button', { name: 'Online' }));
    expect(form().getValues('location_type')).toBe('VIRTUAL');
    expect(screen.getByRole('textbox', { name: 'Join link' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Venue' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Online' }));
    expect(form().getValues('location_type')).toBe('VIRTUAL');

    await user.click(screen.getByRole('button', { name: 'In person' }));
    expect(form().getValues('location_type')).toBe('IN_PERSON');
    expect(screen.queryByRole('textbox', { name: 'Join link' })).not.toBeInTheDocument();
  });

  it('searches Google with a Maps key and fills the place, pin, map link and city from a pick', async () => {
    const { user, form } = renderInEventForm(<LocationField cities={CITIES} />, { ...WITH_MAPS, defaults: BLANK_PLACE });
    // Search and the boxes to type or paste into are offered together; nothing to map yet.
    expect(screen.getByRole('textbox', { name: 'Map link' })).toHaveValue('');
    expect(screen.queryByTestId('event-map')).not.toBeInTheDocument();

    await user.type(screen.getByRole('combobox', { name: 'Venue or address' }), 'Lod');
    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));

    const place = pickedFixture({ city: 'new delhi' });
    await waitFor(() => expect(form().getValues('venue_name')).toBe(place.name));
    expect(form().getValues()).toMatchObject({
      address: place.address,
      place_id: place.placeId,
      lat: place.lat,
      lng: place.lng,
      map_url: mapsLink(place),
      city_slug: 'delhi',
    });
    expect(screen.getByRole('textbox', { name: 'Venue' })).toHaveValue(place.name);
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue(place.address);
    expect(within(screen.getByTestId('event-map')).getByTitle(`Map of ${place.name}`)).toHaveAttribute('src', expect.stringContaining(`q=place_id:${place.placeId}`));
  });

  it('leaves the city alone when the place is in none of Lite’s cities', async () => {
    vi.mocked(resolvePlace).mockResolvedValue(pickedFixture({ city: 'Jaipur' }));
    const { user, form } = renderInEventForm(<LocationField cities={CITIES} />, { ...WITH_MAPS, defaults: { ...BLANK_PLACE, city_slug: 'mumbai' } });
    await user.type(screen.getByRole('combobox', { name: 'Venue or address' }), 'Lod');
    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));
    await waitFor(() => expect(form().getValues('venue_name')).toBe('Lodhi Garden'));
    expect(form().getValues('city_slug')).toBe('mumbai');
  });

  it('keeps a saved pin until the host edits the place by hand, then drops it so the map follows the words', async () => {
    const { user, form } = renderInEventForm(<LocationField cities={CITIES} />, {
      ...WITH_MAPS,
      defaults: { venue_name: 'Lodhi Garden', address: 'Lodhi Road', map_url: '', place_id: 'place-1', lat: 28.59, lng: 77.21 },
    });
    expect(form().getValues()).toMatchObject({ place_id: 'place-1', lat: 28.59, lng: 77.21 });
    await user.type(screen.getByRole('textbox', { name: 'Address' }), ', Gate 2');

    await waitFor(() => expect(form().getValues()).toMatchObject({ place_id: '', lat: null, lng: null, venue_name: 'Lodhi Garden', address: 'Lodhi Road, Gate 2' }));
    expect(screen.getByTitle('Map of Lodhi Garden')).toHaveAttribute('src', expect.stringContaining(`q=${encodeURIComponent('Lodhi Garden, Lodhi Road, Gate 2')}`));
  });

  it('falls back to typed fields, and says why, when Google cannot be reached', async () => {
    vi.mocked(loadPlaces).mockReturnValue(failedLoad());
    const { user } = renderInEventForm(<LocationField cities={CITIES} />, { ...WITH_MAPS, defaults: BLANK_PLACE });
    await user.type(screen.getByRole('combobox', { name: 'Venue or address' }), 'Lod');

    expect(await screen.findByRole('status')).toHaveTextContent('Place search is not available right now. Enter the venue and address by hand below.');
    expect(screen.getByRole('textbox', { name: 'Venue' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Venue or address' })).not.toBeInTheDocument();
  });
});
