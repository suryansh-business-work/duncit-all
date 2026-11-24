import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TICKET_ACCENT } from './ticket.pdf';

/**
 * The pictures a wallet pass carries, drawn from the same brand files the
 * ticket PDF uses — so the pass and the PDF are recognisably one ticket.
 *
 * Rendered once per process and kept: they depend on nothing but the bundled
 * brand files, and Wallet asks for them on every pass.
 */

const asset = (name: string) => fs.readFileSync(path.resolve(__dirname, '../_assets', name));

/** The white mark centred on a brand-red square. */
async function markTile(size: number): Promise<Buffer> {
  const mark = await sharp(asset('duncit-mark-white.png'))
    .resize(Math.round(size * 0.62), Math.round(size * 0.62), { fit: 'inside' })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: TICKET_ACCENT } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** The white wordmark on a transparent strip (the pass itself is brand red). */
const wordmark = (width: number, height: number) =>
  sharp(asset('duncit-wordmark-white.png'))
    .resize(width, height, { fit: 'contain', position: 'left', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

/** Apple's file names and point sizes: icon 29×29, logo up to 160×50, each at @1x/@2x/@3x. */
async function renderApplePassImages(): Promise<Record<string, Buffer>> {
  const [icon, icon2, icon3, logo, logo2, logo3] = await Promise.all([
    markTile(29),
    markTile(58),
    markTile(87),
    wordmark(160, 50),
    wordmark(320, 100),
    wordmark(480, 150),
  ]);
  return {
    'icon.png': icon,
    'icon@2x.png': icon2,
    'icon@3x.png': icon3,
    'logo.png': logo,
    'logo@2x.png': logo2,
    'logo@3x.png': logo3,
  };
}

let applePassImages: Promise<Record<string, Buffer>> | null = null;
let googleLogo: Promise<Buffer> | null = null;

/** The images every Apple pass zips in. A failed render is retried next call. */
export function walletPassImages(): Promise<Record<string, Buffer>> {
  applePassImages ??= renderApplePassImages().catch((error: unknown) => {
    applePassImages = null;
    throw error;
  });
  return applePassImages;
}

/** Google Wallet's class logo: square, 660×660 recommended (it is shown in a circle). */
export function googleWalletLogo(): Promise<Buffer> {
  googleLogo ??= markTile(660).catch((error: unknown) => {
    googleLogo = null;
    throw error;
  });
  return googleLogo;
}
