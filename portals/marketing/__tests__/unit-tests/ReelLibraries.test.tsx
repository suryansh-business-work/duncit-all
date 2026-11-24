import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { REEL_MEDIA_SEARCH } from '../../src/pages/reels/queries';
import MusicTab from '../../src/pages/reels/studio/sources/MusicTab';
import MusicTrackRow from '../../src/pages/reels/studio/sources/MusicTrackRow';
import SourcesPanel from '../../src/pages/reels/studio/sources/SourcesPanel';
import StockTab, { heldIdOf, heldIds, toStockInput } from '../../src/pages/reels/studio/sources/StockTab';
import type { ReelActions } from '../../src/pages/reels/studio/useReelActions';
import { renderWithProviders } from '../testkit';
import { answerQuery, queryOptions, reelAsset, reelProject, reelSpec, reelStockItem, reelStockPage, resetApollo } from '../mocks/reel-apollo-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

// The footage list asks before removing a file; nothing here removes one.
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => vi.fn(),
}));

const actions = (over: Partial<ReelActions> = {}): ReelActions =>
  ({ addStockItems: vi.fn(async () => true), addingStock: false, ...over }) as unknown as ReelActions;

const track = (over: Parameters<typeof reelStockItem>[0] = {}) =>
  reelStockItem({
    id: 'jamendo-9',
    kind: 'AUDIO',
    url: 'https://prod-1.storage.jamendo.com/?trackid=9',
    preview_url: 'https://usercontent.jamendo.com/?type=album&id=9',
    width: 0,
    height: 0,
    duration_ms: 61_000,
    licence: 'CC BY 3.0 — http://creativecommons.org/licenses/by/3.0/',
    attribution: '"Rally" by Nets on Jamendo',
    provider_id: '9',
    provider: 'JAMENDO',
    ...over,
  });

beforeEach(() => resetApollo());

describe('library ids', () => {
  it('keeps Pexels ids bare, as older reels hold them, and prefixes the other libraries', () => {
    expect(heldIdOf({ provider: 'PEXELS', provider_id: '12' })).toBe('12');
    expect(heldIdOf({ provider: 'PIXABAY', provider_id: '12' })).toBe('pixabay:12');
    expect(heldIdOf({ provider: 'JAMENDO', provider_id: '12' })).toBe('jamendo:12');
  });

  it('lists the library files a reel holds, ignoring footage from Drive and uploads', () => {
    expect([...heldIds([reelAsset({ provider_id: 'pixabay:1' }), reelAsset({ provider_id: '' })])]).toEqual(['pixabay:1']);
  });

  it('passes the library back with a pick', () => {
    expect(toStockInput(track())).toMatchObject({ provider: 'JAMENDO', provider_id: '9', kind: 'AUDIO', name: '"Rally" by Nets on Jamendo' });
  });
});

describe('MusicTab', () => {
  const searchFor = (words: string) => {
    fireEvent.change(screen.getByTestId('reel-music-query'), { target: { value: words } });
    fireEvent.submit(screen.getByTestId('reel-music-form'));
  };

  it('searches Jamendo for music, lists each track with its licence, and adds one', async () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([track(), track({ id: 'jamendo-10', provider_id: '10' })], true) } });
    const studio = actions();
    renderWithProviders(<MusicTab project={reelProject({ assets: [reelAsset({ provider_id: 'jamendo:10', source: 'STOCK' })] })} actions={studio} />);
    expect(screen.getByTestId('reel-music-search')).toBeDisabled();

    searchFor(' upbeat ');
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toEqual({ query: 'upbeat', kind: 'AUDIO', orientation: 'PORTRAIT', page: 1, provider: 'JAMENDO' });
    expect(screen.getByTestId('reel-music-item-jamendo-9')).toHaveTextContent('1:01 · CC BY 3.0');
    // Already in the reel: a tick instead of the add button.
    expect(screen.queryByTestId('reel-music-add-jamendo-10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-music-add-jamendo-9'));
    await waitFor(() => expect(studio.addStockItems).toHaveBeenCalledWith([toStockInput(track())]));

    fireEvent.click(screen.getByTestId('reel-music-more'));
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toMatchObject({ page: 2, provider: 'JAMENDO' });
  });

  it('says when nothing matched, and why a search failed', () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([]) } });
    const { unmount } = renderWithProviders(<MusicTab project={reelProject()} actions={actions()} />);
    searchFor('zzz');
    expect(screen.getByTestId('reel-music-empty')).toBeInTheDocument();
    unmount();

    answerQuery(REEL_MEDIA_SEARCH, { error: new Error('Jamendo is not configured. Add its key in the Tech portal (JAMENDO).') });
    renderWithProviders(<MusicTab project={reelProject()} actions={actions()} />);
    searchFor('x');
    expect(screen.getByTestId('reel-music-error')).toHaveTextContent('Jamendo is not configured');
    expect(screen.queryByTestId('reel-music-empty')).not.toBeInTheDocument();
  });
});

describe('MusicTrackRow', () => {
  it('offers a preview that downloads nothing until played, named for the track', () => {
    renderWithProviders(<MusicTrackRow track={track()} added={false} busy={false} onAdd={vi.fn()} />);
    const preview = screen.getByTestId('reel-music-preview-jamendo-9');
    expect(preview).toHaveAttribute('preload', 'none');
    expect(preview).toHaveAttribute('src', track().url);
    expect(preview).toHaveAccessibleName('Listen to "Rally" by Nets on Jamendo');
    expect(screen.getByTestId('reel-music-add-jamendo-9')).toHaveAccessibleName('Add "Rally" by Nets on Jamendo to the reel');
  });

  it('holds the add button while a pick is being added, and shows no player without a stream', () => {
    const onAdd = vi.fn();
    renderWithProviders(<MusicTrackRow track={track({ url: '' })} added={false} busy onAdd={onAdd} />);
    expect(screen.getByTestId('reel-music-add-jamendo-9')).toBeDisabled();
    expect(screen.queryByTestId('reel-music-preview-jamendo-9')).not.toBeInTheDocument();
  });
});

describe('the Pixabay shelf', () => {
  it('searches Pixabay, says where the results come from, and knows what the reel already took from it', () => {
    answerQuery(REEL_MEDIA_SEARCH, {
      data: { reelMediaSearch: reelStockPage([reelStockItem({ id: 'pixabay-video-7', provider_id: '7', provider: 'PIXABAY' }), reelStockItem({ id: 'pixabay-video-8', provider_id: '8', provider: 'PIXABAY' })]) },
    });
    renderWithProviders(<StockTab project={reelProject({ assets: [reelAsset({ provider_id: 'pixabay:8', source: 'STOCK' })] })} actions={actions()} provider="PIXABAY" />);
    expect(screen.getByTestId('reel-stock-tab')).toHaveAttribute('data-provider', 'PIXABAY');
    expect(screen.getByTestId('reel-stock-form')).toHaveTextContent('Photos and videos from Pixabay');
    fireEvent.change(screen.getByTestId('reel-stock-query'), { target: { value: 'surf' } });
    fireEvent.submit(screen.getByTestId('reel-stock-form'));
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toMatchObject({ provider: 'PIXABAY', kind: 'VIDEO' });
    expect(screen.getByTestId('reel-stock-add-pixabay-video-7')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-stock-add-pixabay-video-8')).not.toBeInTheDocument();
  });
});

describe('SourcesPanel shelves', () => {
  it('offers Pixabay and Music beside Google Drive and Stock', () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([]) } });
    renderWithProviders(<SourcesPanel project={reelProject({ spec: reelSpec() })} actions={actions()} onEditDetails={vi.fn()} />, { initialEntries: ['/?sources=music'] });
    expect(screen.getByTestId('reel-sources-tab-drive')).toBeInTheDocument();
    expect(screen.getByTestId('reel-sources-tab-pixabay')).toHaveTextContent('Pixabay');
    expect(screen.getByTestId('reel-sources-tab-music')).toHaveTextContent('Music');
    expect(screen.getByTestId('reel-music-tab')).toBeInTheDocument();
  });
});
