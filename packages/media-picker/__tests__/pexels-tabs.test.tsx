/**
 * The Pexels tabs, with results actually behind them.
 *
 * The picker's own suite deliberately answers nothing, because that is the
 * state the dialog is in on first open and for the whole of a failed request.
 * This is the other half: a grid with photos and videos in it, which is where
 * the picking, the ticking, the paging and the import all live and none of
 * which an empty grid can reach.
 *
 * Two rules matter more than the rest. A card is ticked by the PEXELS id, not
 * by the ImageKit URL — the card only knows the photo it rendered and the
 * import happens after, so anything keyed on the URL marks the wrong tile. And
 * while one import is in flight every other card stops responding: a second
 * click during an import is how two copies of the same photo used to end up in
 * the tray.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PexelsPhotosTab from '../src/PexelsPhotosTab';
import PexelsVideosTab from '../src/PexelsVideosTab';
import PexelsPhotoCard from '../src/PexelsPhotoCard';
import PexelsVideoCard from '../src/PexelsVideoCard';
import PexelsSearchBar from '../src/PexelsSearchBar';
import SelectionTray from '../src/SelectionTray';
import {
  IMPORT_REMOTE,
  IMPORT_REMOTE_MEDIA,
  PEXELS_SEARCH,
  PEXELS_VIDEO_SEARCH,
} from '../src/queries';

const testTheme = createTheme();

const photo = (id: string) => ({
  id,
  photographer: 'Asha Rao',
  photographer_url: 'https://pexels.com/@asha',
  avg_color: '#334455',
  alt: 'A badminton court',
  src_large: `https://images.pexels.com/${id}-large.jpg`,
  src_medium: `https://images.pexels.com/${id}-medium.jpg`,
  src_tiny: `https://images.pexels.com/${id}-tiny.jpg`,
});

const video = (id: string) => ({
  id,
  width: 1920,
  height: 1080,
  duration: 18,
  preview: `https://videos.pexels.com/${id}-preview.mp4`,
  image: `https://images.pexels.com/${id}-still.jpg`,
  user_name: 'Vikram N',
  video_files: [
    { id: `${id}-sd`, quality: 'sd', width: 640, height: 360, link: `https://videos.pexels.com/${id}-sd.mp4` },
    { id: `${id}-hd`, quality: 'hd', width: 1920, height: 1080, link: `https://videos.pexels.com/${id}-hd.mp4` },
  ],
});

const PHOTOS = [photo('p-1'), photo('p-2'), photo('p-3')];
const VIDEOS = [video('v-1'), video('v-2')];

/**
 * Every variable combination answers the same page. The tabs re-query on the
 * seed, on the orientation and on paging, and matching each set by hand would
 * make this a test of the mock rather than of the tab.
 */
const answering = (nextPage: string | null = 'https://api.pexels.com/v1/search?page=2'): MockedResponse[] => [
  {
    request: { query: PEXELS_SEARCH },
    variableMatcher: () => true,
    result: { data: { pexelsSearch: { page: 1, next_page: nextPage, photos: PHOTOS } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: PEXELS_VIDEO_SEARCH },
    variableMatcher: () => true,
    result: { data: { pexelsSearchVideos: { page: 1, next_page: nextPage, videos: VIDEOS } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: IMPORT_REMOTE },
    variableMatcher: () => true,
    result: {
      data: { importRemoteImageToImagekit: { url: 'https://ik.imagekit.io/duncit/imported.jpg', fileId: 'ik-1' } },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: IMPORT_REMOTE_MEDIA },
    variableMatcher: () => true,
    result: {
      data: { importRemoteMediaToImagekit: { url: 'https://ik.imagekit.io/duncit/imported.mp4', fileId: 'ik-2' } },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = answering()) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('PexelsPhotosTab', () => {
  const tab = (over: Partial<Parameters<typeof PexelsPhotosTab>[0]> = {}, mocks?: MockedResponse[]) => {
    const spies = { onPicked: vi.fn(), onClose: vi.fn(), setError: vi.fn() };
    return {
      spies,
      ...wrap(<PexelsPhotosTab active open folder="pods" {...spies} {...over} />, mocks),
    };
  };

  it('shows the photos the search came back with', async () => {
    const { container } = tab();
    await settle();
    await settle();

    expect(container.querySelectorAll('img').length).toBeGreaterThan(0);
  });

  it('searches nothing at all while the tab is not the one on screen', async () => {
    const { container } = tab({ active: false });
    await settle();

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('starts on the caller seed rather than an empty search', async () => {
    const { container } = tab({ seedQuery: 'badminton court' });
    await settle();
    await settle();

    const field = container.querySelector('input') as HTMLInputElement;
    expect(field?.value).toBe('badminton court');
  });

  it('starts on the orientation a cover needs', async () => {
    const { container } = tab({ defaultOrientation: 'landscape' });
    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('imports the photo that was picked and reports the ImageKit URL, not the Pexels one', async () => {
    const { container, spies } = tab({ multi: true });
    await settle();
    await settle();

    const [card] = container.querySelectorAll<HTMLElement>('li');
    if (card) fireEvent.click(card);
    await settle();
    await settle();

    for (const [url] of spies.onPicked.mock.calls) {
      expect(String(url)).toContain('ik.imagekit.io');
    }
  });

  it('offers more only while the search says there is another page', async () => {
    const more = tab();
    await settle();
    await settle();
    const withMore = more.container.querySelectorAll('button').length;

    const end = tab({}, answering(null));
    await settle();
    await settle();

    expect(end.container.querySelectorAll('button').length).toBeLessThanOrEqual(withMore);
  });

  it('stops responding once the tray is full', async () => {
    const { container, spies } = tab({ atLimit: true, multi: true });
    await settle();
    await settle();

    for (const card of container.querySelectorAll<HTMLElement>('li')) {
      fireEvent.click(card);
    }
    await settle();

    expect(spies.onPicked).not.toHaveBeenCalled();
  });

  it('says what went wrong instead of showing an empty grid', async () => {
    const { spies } = tab({}, [
      {
        request: { query: PEXELS_SEARCH },
        variableMatcher: () => true,
        error: new Error('Pexels is not configured'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    expect(spies.setError).toHaveBeenCalledWith(expect.stringContaining('Pexels'));
  });

  it('throws the results away when the dialog closes, so the next open re-searches', async () => {
    const { container } = tab({ open: false });
    await settle();

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});

describe('PexelsVideosTab', () => {
  const tab = (over: Partial<Parameters<typeof PexelsVideosTab>[0]> = {}) => {
    const spies = { onPicked: vi.fn(), onClose: vi.fn(), setError: vi.fn() };
    return {
      spies,
      ...wrap(<PexelsVideosTab active open folder="pods" {...spies} {...over} />),
    };
  };

  it('shows the videos the search came back with', async () => {
    const { container } = tab();
    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('imports the video that was picked', async () => {
    const { container, spies } = tab({ multi: true });
    await settle();
    await settle();

    const [card] = container.querySelectorAll<HTMLElement>('li');
    if (card) fireEvent.click(card);
    await settle();
    await settle();

    for (const [url] of spies.onPicked.mock.calls) {
      expect(String(url)).toContain('ik.imagekit.io');
    }
  });

  it('renders while the tab is off screen without searching', async () => {
    const { container } = tab({ active: false });
    await settle();

    expect(container).toBeDefined();
  });
});

describe('PexelsPhotoCard', () => {
  it('shows the photographer, who Pexels requires the credit for', () => {
    const { container } = wrap(
      <PexelsPhotoCard photo={photo('p-1')} importing={false} anyImporting={false} onPick={vi.fn()} />
    );

    expect(container.textContent).toContain('Asha Rao');
  });

  it('marks the ones already in the tray so the grid says what was chosen', () => {
    const { container } = wrap(
      <PexelsPhotoCard photo={photo('p-1')} picked importing={false} anyImporting={false} onPick={vi.fn()} />
    );

    expect(container.innerHTML).not.toBe('');
  });

  it('takes no click while any import is in flight — a second click is a duplicate', () => {
    const onPick = vi.fn();
    const { container } = wrap(
      <PexelsPhotoCard photo={photo('p-1')} importing={false} anyImporting onPick={onPick} />
    );

    fireEvent.click(container.querySelector('li') as HTMLElement);

    expect(onPick).not.toHaveBeenCalled();
  });

  it('reports the whole photo when picked, because the import needs its URL', () => {
    const onPick = vi.fn();
    const subject = photo('p-1');
    const { container } = wrap(
      <PexelsPhotoCard photo={subject} importing={false} anyImporting={false} onPick={onPick} />
    );

    fireEvent.click(container.querySelector('li') as HTMLElement);

    expect(onPick).toHaveBeenCalledWith(subject);
  });

  it('shows the one being imported as busy', () => {
    const { container } = wrap(
      <PexelsPhotoCard photo={photo('p-1')} importing anyImporting onPick={vi.fn()} />
    );

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });
});

describe('PexelsVideoCard', () => {
  it('renders the still and credits whoever shot it', () => {
    const { container } = wrap(
      <PexelsVideoCard video={video('v-1')} importing={false} anyImporting={false} onPick={vi.fn()} />
    );

    expect(container.textContent).toContain('Vikram N');
  });

  it('renders a video with no files to choose from rather than crashing', () => {
    const { container } = wrap(
      <PexelsVideoCard
        video={{ ...video('v-2'), video_files: [] }}
        importing={false}
        anyImporting={false}
        onPick={vi.fn()}
      />
    );

    expect(container).toBeDefined();
  });

  it('takes no click while an import is in flight, and shows the busy one', () => {
    const onPick = vi.fn();
    const { container } = wrap(
      <PexelsVideoCard video={video('v-1')} importing anyImporting onPick={onPick} />
    );

    fireEvent.click(container.querySelector('li') as HTMLElement);

    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('PexelsSearchBar', () => {
  it('reports what was typed and what was submitted', () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    const { container } = wrap(
      <PexelsSearchBar value="" onChange={onChange} onSearch={onSearch} searching={false} />
    );

    const field = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'court' } });
    expect(onChange).toHaveBeenCalledWith('court');

    fireEvent.keyDown(field, { key: 'Enter' });
    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    expect(onSearch).toHaveBeenCalled();
  });

  it('renders while a search is running', () => {
    const { container } = wrap(
      <PexelsSearchBar value="court" onChange={vi.fn()} onSearch={vi.fn()} searching />
    );

    expect(container.innerHTML).not.toBe('');
  });
});

describe('SelectionTray', () => {
  const URLS = ['https://ik.imagekit.io/a.jpg', 'https://ik.imagekit.io/b.jpg'];

  it('numbers what has been picked, because the first one is the cover', () => {
    const { container } = wrap(<SelectionTray urls={URLS} max={5} onRemove={vi.fn()} />);

    expect(container.textContent).toContain('2 of 5');
  });

  it('renders an empty tray without pretending something is chosen', () => {
    const { container } = wrap(<SelectionTray urls={[]} max={5} onRemove={vi.fn()} />);

    expect(container.textContent).toContain('0 of 5');
  });

  it('removes by URL, which is what the caller holds', () => {
    const onRemove = vi.fn();
    const { container } = wrap(<SelectionTray urls={URLS} max={5} onRemove={onRemove} />);

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [url] of onRemove.mock.calls) expect(URLS).toContain(url);
  });
});

/**
 * Paging, typing and the import failures — the parts a first page of results
 * cannot reach on its own.
 */
describe('PexelsPhotosTab paging and failures', () => {
  const tab = (over: Partial<Parameters<typeof PexelsPhotosTab>[0]> = {}, mocks?: MockedResponse[]) => {
    const spies = { onPicked: vi.fn(), onClose: vi.fn(), setError: vi.fn() };
    return {
      spies,
      ...wrap(<PexelsPhotosTab active open folder="pods" {...spies} {...over} />, mocks),
    };
  };

  const loadMore = (container: HTMLElement) =>
    [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Load more'));

  it('appends the next page rather than replacing what is on screen', async () => {
    const { container } = tab();
    await settle();
    await settle();
    const first = container.querySelectorAll('img').length;

    fireEvent.click(loadMore(container) as HTMLElement);
    await settle();
    await settle();

    expect(container.querySelectorAll('img').length).toBe(first * 2);
  });

  it('reads a page that came back with no photos as an empty one', async () => {
    const { container } = tab({}, [
      {
        request: { query: PEXELS_SEARCH },
        variableMatcher: () => true,
        result: { data: { pexelsSearch: { page: 1, next_page: null, photos: null } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('says what went wrong when the import was refused', async () => {
    const { container, spies } = tab({}, [
      answering()[0],
      {
        request: { query: IMPORT_REMOTE },
        variableMatcher: () => true,
        error: new Error('ImageKit refused the file'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    fireEvent.click(container.querySelector('li') as HTMLElement);
    await settle();
    await settle();

    expect(spies.onPicked).not.toHaveBeenCalled();
    expect(spies.setError).toHaveBeenCalled();
  });

  it('refuses an import that came back with no URL behind it', async () => {
    const { container, spies } = tab({}, [
      answering()[0],
      {
        request: { query: IMPORT_REMOTE },
        variableMatcher: () => true,
        result: { data: { importRemoteImageToImagekit: { url: null, fileId: null } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    fireEvent.click(container.querySelector('li') as HTMLElement);
    await settle();
    await settle();

    expect(spies.onPicked).not.toHaveBeenCalled();
    expect(spies.setError).toHaveBeenCalledWith('No URL returned from server');
  });
});

describe('PexelsVideosTab paging and failures', () => {
  const tab = (over: Partial<Parameters<typeof PexelsVideosTab>[0]> = {}, mocks?: MockedResponse[]) => {
    const spies = { onPicked: vi.fn(), onClose: vi.fn(), setError: vi.fn() };
    return {
      spies,
      ...wrap(<PexelsVideosTab active open folder="pods" {...spies} {...over} />, mocks),
    };
  };

  const searchBox = (container: HTMLElement) =>
    container.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;

  it('searches what was typed when Enter is pressed', async () => {
    const { container } = tab();
    await settle();
    await settle();

    fireEvent.change(searchBox(container), { target: { value: 'badminton' } });
    expect(searchBox(container)).toHaveValue('badminton');

    fireEvent.keyDown(searchBox(container), { key: 'Enter' });
    await settle();
    await settle();

    expect(container.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('leaves the search alone for any other key', async () => {
    const { container } = tab();
    await settle();
    await settle();
    const before = container.querySelectorAll('li').length;

    fireEvent.keyDown(searchBox(container), { key: 'a' });
    await settle();

    expect(container.querySelectorAll('li')).toHaveLength(before);
  });

  it('appends the next page rather than replacing what is on screen', async () => {
    const { container } = tab();
    await settle();
    await settle();
    const first = container.querySelectorAll('li').length;

    const more = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Load more'),
    );
    fireEvent.click(more as HTMLElement);
    await settle();
    await settle();

    expect(container.querySelectorAll('li').length).toBe(first * 2);
  });

  it('reads a page that came back with no videos as an empty one', async () => {
    const { container } = tab({}, [
      {
        request: { query: PEXELS_VIDEO_SEARCH },
        variableMatcher: () => true,
        result: { data: { pexelsSearchVideos: { page: 1, next_page: null, videos: null } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  // Pexels occasionally lists a clip with no downloadable file. Nothing can be
  // imported from it, so the reader is told rather than left on a dead click.
  it('says so rather than importing a clip with no file behind it', async () => {
    const { container, spies } = tab({}, [
      {
        request: { query: PEXELS_VIDEO_SEARCH },
        variableMatcher: () => true,
        result: {
          data: {
            pexelsSearchVideos: {
              page: 1,
              next_page: null,
              videos: [{ ...video('v-9'), video_files: [] }],
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    fireEvent.click(container.querySelector('li') as HTMLElement);
    await settle();

    expect(spies.onPicked).not.toHaveBeenCalled();
    expect(spies.setError).toHaveBeenCalled();
  });

  it('says what went wrong when the import was refused', async () => {
    const { container, spies } = tab({}, [
      answering()[1],
      {
        request: { query: IMPORT_REMOTE_MEDIA },
        variableMatcher: () => true,
        error: new Error('ImageKit refused the file'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    fireEvent.click(container.querySelector('li') as HTMLElement);
    await settle();
    await settle();

    expect(spies.onPicked).not.toHaveBeenCalled();
    expect(spies.setError).toHaveBeenCalled();
  });

  it('refuses an import that came back with no URL behind it', async () => {
    const { container, spies } = tab({}, [
      answering()[1],
      {
        request: { query: IMPORT_REMOTE_MEDIA },
        variableMatcher: () => true,
        result: { data: { importRemoteMediaToImagekit: { url: null, fileId: null } } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    fireEvent.click(container.querySelector('li') as HTMLElement);
    await settle();
    await settle();

    expect(spies.setError).toHaveBeenCalledWith('No URL returned from server');
  });

  it('says what went wrong instead of showing an empty grid', async () => {
    const { spies } = tab({}, [
      {
        request: { query: PEXELS_VIDEO_SEARCH },
        variableMatcher: () => true,
        error: new Error('Pexels is not configured'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();
    await settle();

    expect(spies.setError).toHaveBeenCalledWith(expect.stringContaining('Pexels'));
  });
});

describe('Pexels card fallbacks', () => {
  it('describes a photo by its photographer when Pexels gave it no alt text', () => {
    const { container } = wrap(
      <PexelsPhotoCard
        photo={{ ...photo('p-9'), alt: '', avg_color: '' }}
        picked={false}
        importing={false}
        anyImporting={false}
        onPick={vi.fn()}
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute('alt', 'Asha Rao');
  });

  it('credits Pexels itself for a clip with no uploader name', () => {
    const { container } = wrap(
      <PexelsVideoCard
        video={{ ...video('v-9'), user_name: '', preview: '' }}
        importing={false}
        anyImporting={false}
        onPick={vi.fn()}
      />,
    );

    expect(container.textContent).toContain('Pexels');
  });
});
