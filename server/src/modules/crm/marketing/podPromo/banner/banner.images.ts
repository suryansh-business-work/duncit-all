import fs from 'node:fs';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import QRCode from 'qrcode';
import { logs } from '@observability/log';
import { outboundFetch } from '@utils/outboundFetch';
import { isTrustedMediaUrl } from '@utils/url';
import type { Rgb } from './banner.palette';
import { QR_COLORS } from './banner.theme';
import type { ImageSlot } from './banner.layout';

/**
 * The pictures on a slide: downloaded once, cropped to their box on the
 * subject (sharp's attention strategy keeps faces and the busy part of a
 * photo in frame), masked to a rounded card or a circle, and the QR code.
 */
const MAX_BYTES = 20 * 1024 * 1024;
const ASSETS = path.resolve(__dirname, '../../../../../services/_assets');

/** A picture from our CDN or a stock library, or null when it cannot be had — a banner never fails on one photo. */
export async function fetchImage(url: string): Promise<Buffer | null> {
  if (!isTrustedMediaUrl(url)) return null;
  try {
    const res = await outboundFetch('ImageKit', url);
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') ?? '')) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 && bytes.length <= MAX_BYTES ? bytes : null;
  } catch (error) {
    logs.server.warn('pod-promo-banner', 'fetchImage', { error, url, msg: 'a banner picture could not be downloaded' });
    return null;
  }
}

/** The bundled Duncit wordmark: white for dark slides, red for light ones. */
export function bundledWordmark(light: boolean): Buffer | null {
  try {
    return fs.readFileSync(path.join(ASSETS, light ? 'duncit-wordmark-red.png' : 'duncit-wordmark-white.png'));
  } catch {
    return null;
  }
}

/** The photo's dominant colour, for picking the family palette; null for an unreadable image. */
export async function dominantColor(bytes: Buffer | null): Promise<Rgb | null> {
  if (!bytes) return null;
  try {
    const { dominant } = await sharp(bytes).stats();
    return dominant;
  } catch {
    return null;
  }
}

export async function qrPng(url: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(url, { width: size, margin: 1, errorCorrectionLevel: 'M', color: { dark: QR_COLORS.dark, light: QR_COLORS.light } });
}

function maskSvg(slot: ImageSlot, w: number, h: number): Buffer {
  const shape =
    slot.shape === 'circle'
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}"/>`
      : `<rect width="${w}" height="${h}" rx="${Math.min(slot.radius ?? 0, w / 2, h / 2)}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${shape}</svg>`);
}

/** One picture fitted to its slot, as a PNG ready to composite at (slot.x, slot.y); null when it cannot be decoded. */
export async function fitToSlot(bytes: Buffer, slot: ImageSlot): Promise<OverlayOptions | null> {
  const w = Math.round(slot.w);
  const h = Math.round(slot.h);
  try {
    let image = sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize(w, h, slot.fit === 'cover' ? { fit: 'cover', position: sharp.strategy.attention } : { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png();
    if (slot.shape !== 'rect') {
      image = sharp(await image.toBuffer()).composite([{ input: maskSvg(slot, w, h), blend: 'dest-in' }]).png();
    }
    return { input: await image.toBuffer(), left: Math.round(slot.x), top: Math.round(slot.y) };
  } catch (error) {
    logs.server.warn('pod-promo-banner', 'fitToSlot', { error, source: slot.source, msg: 'a banner picture could not be decoded' });
    return null;
  }
}
