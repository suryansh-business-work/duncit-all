import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPlaces, resolvePlace, suggestPlaces } from '../../../../lib/googleMaps';
import { PlaceSearch } from '../../../../pages/event-form/luma/PlaceSearch';
import { captureNotifications, renderWithProviders } from '../../../test-utils';
import { failedLoad, fakePlaces, pickedFixture, suggestionFixture } from '../helpers';

vi.mock('../../../../lib/googleMaps', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/googleMaps')>()),
  loadPlaces: vi.fn(),
  suggestPlaces: vi.fn(),
  resolvePlace: vi.fn(),
}));

const LODHI = suggestionFixture();

let places = fakePlaces();

beforeEach(() => {
  places = fakePlaces();
  vi.mocked(loadPlaces).mockResolvedValue(places.lib);
  vi.mocked(suggestPlaces).mockResolvedValue([LODHI]);
  vi.mocked(resolvePlace).mockResolvedValue(pickedFixture());
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderSearch(options: Parameters<typeof renderWithProviders>[1] = {}) {
  const onPick = vi.fn();
  const onUnavailable = vi.fn();
  const utils = renderWithProviders(<PlaceSearch apiKey="maps-browser-key" onPick={onPick} onUnavailable={onUnavailable} />, options);
  return { ...utils, onPick, onUnavailable, input: screen.getByRole('combobox', { name: 'Venue or address' }) };
}

describe('PlaceSearch', () => {
  it('loads Places once with the console’s browser key', () => {
    renderSearch();
    expect(loadPlaces).toHaveBeenCalledTimes(1);
    expect(loadPlaces).toHaveBeenCalledWith('maps-browser-key');
    expect(screen.getByRole('combobox', { name: 'Venue or address' })).toHaveAttribute('placeholder', 'Start typing a place name or an address');
  });

  describe('typing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('asks Google only from the third letter, once typing pauses for 300 ms', async () => {
      const { user, input } = renderSearch({ userOptions: { advanceTimers: vi.advanceTimersByTime } });
      await user.type(input, 'Lo');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
      expect(suggestPlaces).not.toHaveBeenCalled();
      expect(screen.getByText('Type at least 3 letters')).toBeInTheDocument();

      await user.type(input, 'dhi');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(299);
      });
      expect(suggestPlaces).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(suggestPlaces).toHaveBeenCalledTimes(1);
      expect(suggestPlaces).toHaveBeenCalledWith(places.lib, 'Lodhi', expect.any(places.Token));
      expect(screen.getByRole('option', { name: /Lodhi Garden/ })).toHaveTextContent('New Delhi, Delhi, India');
    });

    it('shows that it is loading while Google answers', async () => {
      vi.mocked(suggestPlaces).mockReturnValue(new Promise(() => undefined));
      const { user, input } = renderSearch({ userOptions: { advanceTimers: vi.advanceTimersByTime } });
      await user.type(input, 'Lod');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
  });

  it('says so when nothing matches', async () => {
    vi.mocked(suggestPlaces).mockResolvedValue([]);
    const { user, input } = renderSearch();
    await user.type(input, 'Zzyzx');
    expect(await screen.findByText('No places match. Try another name, or enter the address by hand.')).toBeInTheDocument();
  });

  it('hands the picked place, with its details, to the form', async () => {
    const { user, input, onPick } = renderSearch();
    await user.type(input, 'Lod');
    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(pickedFixture()));
    expect(resolvePlace).toHaveBeenCalledWith(LODHI);
  });

  it('does not search again, or open another billed session, when a suggestion is picked', async () => {
    const { user, input, onPick } = renderSearch();
    await user.type(input, 'Lod');
    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    expect(input).toHaveValue('Lodhi Garden');
    // Past the 300 ms pause a search waits for.
    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });
    expect(suggestPlaces).toHaveBeenCalledTimes(1);
  });

  it('keeps one session token through a search and starts a new one after a pick', async () => {
    const { user, input } = renderSearch();
    await user.type(input, 'Lod');
    await screen.findByRole('option', { name: /Lodhi Garden/ });
    await user.type(input, 'h');
    await waitFor(() => expect(suggestPlaces).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(suggestPlaces).mock.calls;
    expect(second[2]).toBe(first[2]);

    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));
    await user.clear(input);
    await user.type(input, 'Gar');
    await waitFor(() => expect(vi.mocked(suggestPlaces).mock.calls.at(-1)?.[1]).toBe('Gar'));
    expect(vi.mocked(suggestPlaces).mock.calls.at(-1)?.[2]).not.toBe(first[2]);
  });

  it('tells the host when the picked place cannot be loaded', async () => {
    vi.mocked(resolvePlace).mockRejectedValue(new Error('NOT_FOUND'));
    const toasts = captureNotifications();
    const { user, input, onPick } = renderSearch();
    await user.type(input, 'Lod');
    await user.click(await screen.findByRole('option', { name: /Lodhi Garden/ }));
    await waitFor(() =>
      expect(toasts.seen).toContainEqual({ message: 'That place could not be loaded. Try again, or enter the address by hand.', severity: 'error' }),
    );
    expect(onPick).not.toHaveBeenCalled();
    toasts.stop();
  });

  it('reports Google as unavailable as soon as the script cannot load, before any search', async () => {
    vi.mocked(loadPlaces).mockReturnValue(failedLoad());
    const { onUnavailable } = renderSearch();
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1));
    expect(suggestPlaces).not.toHaveBeenCalled();
  });
});
