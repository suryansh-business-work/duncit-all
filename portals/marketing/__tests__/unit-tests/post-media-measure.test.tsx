import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaListField: (await import('../mocks/media-list-field.mock')).MediaListFieldStub,
}));
const measure = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('../../src/pages/social-accounts-page/social-post-form/measureMedia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/pages/social-accounts-page/social-post-form/measureMedia')>()),
  measureMedia: measure.fn,
}));

import PostMediaField, { linesToMedia } from '../../src/pages/social-accounts-page/social-post-form/PostMediaField';
import { blankSocialPostValues, type SocialPostFormValues } from '../../src/pages/social-accounts-page/social-post-form/social-post.types';
import type { SocialPostMedia } from '../../src/pages/social-accounts-page/publish.queries';

const IMAGE: SocialPostMedia = { url: 'https://ik.imagekit.io/duncit/a.jpg', type: 'IMAGE' };
const VIDEO: SocialPostMedia = { url: 'https://ik.imagekit.io/duncit/b.mp4', type: 'VIDEO' };

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('linesToMedia', () => {
  it('keeps what was recorded of a URL already in the list, and reads a new one off its address', () => {
    const known = [{ ...IMAGE, width: 1080, height: 1350 }];
    expect(linesToMedia(`${VIDEO.url}\n  ${IMAGE.url}  \n\n`, known)).toEqual([VIDEO, { ...IMAGE, width: 1080, height: 1350 }]);
  });
});

/** The field inside a real form, with what the form holds shown for the test to read. */
function Harness({ initial }: Readonly<{ initial: SocialPostMedia[] }>) {
  const { control, watch } = useForm<SocialPostFormValues>({ defaultValues: blankSocialPostValues({ media: initial }) });
  return (
    <>
      <PostMediaField control={control} />
      <output data-testid="media-value">{JSON.stringify(watch('media'))}</output>
    </>
  );
}

const held = () => JSON.parse(screen.getByTestId('media-value').textContent ?? '[]') as SocialPostMedia[];

describe('PostMediaField measuring', () => {
  it('measures each new piece once, and keeps what it measured on that piece', async () => {
    measure.fn.mockResolvedValueOnce({ width: 1080, height: 1920, duration_s: 14.2 }).mockResolvedValueOnce(null);
    renderWithProviders(<Harness initial={[VIDEO]} />);
    await waitFor(() => expect(held()).toEqual([{ ...VIDEO, width: 1080, height: 1920, duration_s: 14.2 }]));
    // A new picture the browser cannot read is left unmeasured; the video is not asked again.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: `${VIDEO.url}\n${IMAGE.url}` } });
    await waitFor(() => expect(measure.fn).toHaveBeenCalledTimes(2));
    expect(measure.fn).toHaveBeenLastCalledWith(IMAGE);
    expect(held()).toEqual([{ ...VIDEO, width: 1080, height: 1920, duration_s: 14.2 }, IMAGE]);
  });

  it('does not measure a piece that already carries its measurements', () => {
    renderWithProviders(<Harness initial={[{ ...IMAGE, width: 1080, height: 1080 }]} />);
    expect(measure.fn).not.toHaveBeenCalled();
  });
});

describe('measureMedia', () => {
  it('reads a picture’s natural size, and gives up on one that will not load or has no size', async () => {
    const { measureMedia } = await vi.importActual<typeof import('../../src/pages/social-accounts-page/social-post-form/measureMedia')>(
      '../../src/pages/social-accounts-page/social-post-form/measureMedia'
    );
    const outcomes: Array<'load' | 'error' | 'empty'> = ['load', 'error', 'empty'];
    class FakeImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_url: string) {
        const outcome = outcomes.shift();
        if (outcome === 'error') this.onerror?.();
        else {
          if (outcome === 'load') Object.assign(this, { naturalWidth: 1080, naturalHeight: 1350 });
          this.onload?.();
        }
      }
    }
    vi.stubGlobal('Image', FakeImage);
    await expect(measureMedia(IMAGE)).resolves.toEqual({ width: 1080, height: 1350, duration_s: null });
    await expect(measureMedia(IMAGE)).resolves.toBeNull();
    await expect(measureMedia(IMAGE)).resolves.toBeNull();
  });

  it('reads a video’s size and length from its metadata only, and gives up on a broken one', async () => {
    const { measureMedia } = await vi.importActual<typeof import('../../src/pages/social-accounts-page/social-post-form/measureMedia')>(
      '../../src/pages/social-accounts-page/social-post-form/measureMedia'
    );
    const videos: HTMLVideoElement[] = [];
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = create(tag);
      if (tag === 'video') videos.push(element as HTMLVideoElement);
      return element;
    });
    const read = measureMedia(VIDEO);
    const video = videos[0];
    expect(video.preload).toBe('metadata');
    Object.defineProperties(video, { videoWidth: { value: 1080 }, videoHeight: { value: 1920 }, duration: { value: 42.5 } });
    video.onloadedmetadata?.(new Event('loadedmetadata'));
    await expect(read).resolves.toEqual({ width: 1080, height: 1920, duration_s: 42.5 });

    const endless = measureMedia(VIDEO);
    Object.defineProperties(videos[1], { videoWidth: { value: 640 }, videoHeight: { value: 360 }, duration: { value: Number.POSITIVE_INFINITY } });
    videos[1].onloadedmetadata?.(new Event('loadedmetadata'));
    await expect(endless).resolves.toEqual({ width: 640, height: 360, duration_s: null });

    const broken = measureMedia(VIDEO);
    videos[2].onerror?.(new Event('error'));
    await expect(broken).resolves.toBeNull();
  });
});
