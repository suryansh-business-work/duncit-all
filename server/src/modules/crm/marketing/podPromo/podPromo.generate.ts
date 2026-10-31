import { logs } from '@observability/log';
import { settingsService } from '@modules/platform/settings/settings.service';
import { uploadToImagekit } from '@modules/platform/upload/upload.service';
import { mediaRoot } from '@modules/platform/upload/mediaFolders';
import type { RunContext } from '../runs/marketingRun.service';
import { loadCopy } from './podPromo.copy';
import { loadPodBannerData, type PodBannerData } from './podPromo.pod';
import { aiSlideWords } from './podPromo.ai';
import { ensureTrackingLink, type TrackingLink } from './podPromo.link';
import { templateCopy, type SlideCopy } from './banner/banner.copy';
import { prepareCarousel } from './banner/banner.render';
import { styleForCategories } from './banner/banner.styleMap';
import type { BannerSize, BannerSlide, BannerStyle, SlideKind } from './podPromo.types';

/**
 * One pod's carousel, made and uploaded, as steps of a marketing run: read
 * the pod, its tracking link, the words, then one step per slide — so the
 * Activity timeline shows which slide failed and the rest still upload.
 */
export interface GenerateInput {
  podId: string;
  /** A person's choice; without one Claude's pick, then the category's family. */
  style?: BannerStyle | null;
  size: BannerSize;
  cta_text: string;
  utm_prefix: string;
  userId: string | null;
  /** Render just this slide. */
  only?: SlideKind;
  /** Prefixes the step keys, so one run can hold several pods. */
  stepPrefix?: string;
}

export interface Generated {
  data: PodBannerData;
  copy: SlideCopy;
  style: BannerStyle;
  size: BannerSize;
  slides: BannerSlide[];
  ai_copy: boolean;
  link: TrackingLink;
}

/** Where slides land in the media library: by environment, then pod. */
export const slideFolder = (podId: string) => `${mediaRoot()}/marketing/pod_promos/${podId}`;

async function brandLogoUrl(): Promise<string> {
  try {
    return (await settingsService.getBranding()).logo_url ?? '';
  } catch (error) {
    logs.server.warn('pod-promo', 'brandLogoUrl', { error, msg: 'branding unreadable; the bundled wordmark is used' });
    return '';
  }
}

export async function generateCarousel(input: GenerateInput, run: RunContext): Promise<Generated> {
  const key = (name: string) => (input.stepPrefix ? `${input.stepPrefix}:${name}` : name);
  const data = await run.step(key('pod'), 'Read the pod', () => loadPodBannerData(input.podId), { summarize: (pod) => pod.title });
  const link = await run.step(key('link'), 'Tracking link', () => ensureTrackingLink(data, input.utm_prefix, input.userId), {
    tool: 'shortLink',
    summarize: (made) => made.short_url,
  });
  const words = await run.step(
    key('words'),
    'Banner words',
    async () => aiSlideWords(data, templateCopy(data, await loadCopy(), { cta: input.cta_text, trackingUrl: link.short_url })),
    { tool: 'claude', summarize: (made) => (made.ai ? 'written by AI' : 'template') }
  );
  const style = input.style ?? words.style ?? styleForCategories(data.category_names);
  const carousel = await prepareCarousel({
    data,
    copy: words.copy,
    style,
    size: input.size,
    tracking_url: link.short_url,
    brand_logo_url: await brandLogoUrl(),
    only: input.only,
  });
  const slides: BannerSlide[] = [];
  for (const plan of carousel.plans) {
    const url = await run
      .step(
        key(`slide:${plan.kind}`),
        `Slide: ${plan.kind.toLowerCase()}`,
        async () => {
          const jpeg = await carousel.draw(plan);
          const uploaded = await uploadToImagekit({
            fileBytes: jpeg,
            fileName: `${plan.kind.toLowerCase()}-${style.toLowerCase()}-${input.size.toLowerCase()}.jpg`,
            folder: slideFolder(data.id),
            tags: ['pod-promo'],
          });
          return uploaded.url;
        },
        { tool: 'banner', summarize: (made) => made }
      )
      // One slide that will not draw or upload is left out; the run records why.
      .catch(() => null);
    if (url) slides.push({ kind: plan.kind, url });
  }
  if (slides.length === 0) throw new Error('No slide of the carousel could be made');
  return { data, copy: words.copy, style, size: input.size, slides, ai_copy: words.ai, link };
}
