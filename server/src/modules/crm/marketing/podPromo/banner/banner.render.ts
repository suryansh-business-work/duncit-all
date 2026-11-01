import sharp, { type OverlayOptions } from 'sharp';
import type { BannerSize, BannerStyle, SlideKind } from '../podPromo.types';
import type { PodBannerData } from '../podPromo.pod';
import type { SlideCopy } from './banner.copy';
import { pickPalette, hexToRgb } from './banner.palette';
import { BANNER_DIMENSIONS, BANNER_FAMILIES, JPEG_QUALITY, LIGHT_BACKGROUND_LUMINANCE } from './banner.theme';
import { bundledWordmark, dominantColor, fetchImage, fitToSlot, qrPng } from './banner.images';
import type { Available, ImageSource, SlideContext, SlidePlan } from './banner.layout';
import { bookSlide, coverSlide, detailsSlide } from './banner.slides';
import { hostSlide, venueSlide } from './banner.slides.partners';

/**
 * A pod's carousel, rendered: the slide plans in posting order, each drawn as
 * background, photos, the vector overlay, then logos and the QR code on top,
 * and encoded as JPEG (what Instagram takes).
 */
export interface CarouselInput {
  data: PodBannerData;
  copy: SlideCopy;
  style: BannerStyle;
  size: BannerSize;
  tracking_url: string;
  /** The admin's brand logo; the bundled Duncit wordmark is used when it is empty or unreadable. */
  brand_logo_url: string;
  /** Render just this slide (regenerate one). */
  only?: SlideKind;
}

export interface RenderedSlide {
  kind: SlideKind;
  jpeg: Buffer;
}

/** Every slide that has something to show, in posting order. */
export function planSlides(ctx: SlideContext): SlidePlan[] {
  return [coverSlide(ctx), detailsSlide(ctx), hostSlide(ctx), venueSlide(ctx), bookSlide(ctx)].filter((plan): plan is SlidePlan => plan !== null);
}

function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > LIGHT_BACKGROUND_LUMINANCE;
}

type Pictures = Partial<Record<ImageSource, Buffer>>;

async function gather(input: CarouselInput): Promise<Pictures> {
  const { data } = input;
  const [photo, venue_photo, host_photo, venue_logo, host_logo, brand_logo] = await Promise.all([
    data.photo_urls[0] ? fetchImage(data.photo_urls[0]) : null,
    data.venue?.photo_url ? fetchImage(data.venue.photo_url) : null,
    data.host?.photo_url ? fetchImage(data.host.photo_url) : null,
    data.venue?.kit.logo_url ? fetchImage(data.venue.kit.logo_url) : null,
    data.host?.kit.logo_url ? fetchImage(data.host.kit.logo_url) : null,
    input.brand_logo_url ? fetchImage(input.brand_logo_url) : null,
  ]);
  const pictures: Pictures = {};
  const entries: [ImageSource, Buffer | null][] = [
    ['photo', photo],
    ['venue_photo', venue_photo],
    ['host_photo', host_photo],
    ['venue_logo', venue_logo],
    ['host_logo', host_logo],
    ['brand_logo', brand_logo],
  ];
  for (const [source, bytes] of entries) if (bytes) pictures[source] = bytes;
  return pictures;
}

async function drawSlide(plan: SlidePlan, ctx: SlideContext, pictures: Pictures, input: CarouselInput): Promise<Buffer> {
  const layers: OverlayOptions[] = [];
  const overlay = async (layer: 'under' | 'over') => {
    for (const slot of plan.images.filter((item) => item.layer === layer)) {
      let bytes: Buffer | null | undefined = pictures[slot.source];
      if (slot.source === 'qr') bytes = await qrPng(input.tracking_url, Math.round(slot.w));
      if (slot.source === 'brand_logo' && !bytes) bytes = bundledWordmark(isLight(plan.background));
      const fitted = bytes ? await fitToSlot(bytes, slot) : null;
      if (fitted) layers.push(fitted);
    }
  };
  await overlay('under');
  layers.push({ input: Buffer.from(plan.svg), left: 0, top: 0 });
  await overlay('over');
  return sharp({ create: { width: ctx.width, height: ctx.height, channels: 3, background: plan.background } })
    .composite(layers)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

/** A carousel ready to draw: its pictures fetched once, its slides planned. Each slide is drawn on its own (a run step each). */
export interface PreparedCarousel {
  plans: SlidePlan[];
  draw(plan: SlidePlan): Promise<Buffer>;
}

export async function prepareCarousel(input: CarouselInput): Promise<PreparedCarousel> {
  const pictures = await gather(input);
  const family = BANNER_FAMILIES[input.style];
  const { width, height } = BANNER_DIMENSIONS[input.size];
  const has: Available = {
    photo: !!pictures.photo,
    venue_photo: !!pictures.venue_photo,
    host_photo: !!pictures.host_photo,
    // Always drawn: the admin's logo, else the bundled wordmark.
    brand_logo: true,
    venue_logo: !!pictures.venue_logo,
    host_logo: !!pictures.host_logo,
  };
  const ctx: SlideContext = { width, height, family, palette: pickPalette(family, await dominantColor(pictures.photo ?? null)), copy: input.copy, has };
  return {
    plans: planSlides(ctx).filter((plan) => !input.only || plan.kind === input.only),
    draw: (plan) => drawSlide(plan, ctx, pictures, input),
  };
}

export async function renderCarousel(input: CarouselInput): Promise<RenderedSlide[]> {
  const carousel = await prepareCarousel(input);
  const slides: RenderedSlide[] = [];
  for (const plan of carousel.plans) slides.push({ kind: plan.kind, jpeg: await carousel.draw(plan) });
  return slides;
}
