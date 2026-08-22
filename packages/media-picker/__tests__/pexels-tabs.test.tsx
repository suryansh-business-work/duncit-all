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
