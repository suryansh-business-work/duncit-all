import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/**
 * The Zod rules the inspector forms share. Number fields arrive from inputs as
 * text, so they are coerced; the message names the allowed range, because "too
 * big" tells the operator nothing about what would be accepted.
 */

export const numberIn = (t: Translate, min: number, max: number) =>
  z.coerce
    .number({ error: t('ai.reels.editor.errorRange', { vars: { min, max } }) })
    .min(min, t('ai.reels.editor.errorRange', { vars: { min, max } }))
    .max(max, t('ai.reels.editor.errorRange', { vars: { min, max } }));

const HEX = /^#[\da-f]{6}$/i;

export const hexColor = (t: Translate) => z.string().trim().regex(HEX, t('ai.reels.editor.errorColor'));

/** A colour, or nothing at all. */
export const optionalHexColor = (t: Translate) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || HEX.test(value), t('ai.reels.editor.errorPill'));

/** Milliseconds as the forms show them: seconds, to a tenth. */
export const toSeconds = (ms: number): number => Math.round(ms / 100) / 10;
export const toMs = (seconds: number): number => Math.round(seconds * 1000);

/** 0–1 as a whole percentage, and back. */
export const toPercent = (share: number): number => Math.round(share * 100);
export const toShare = (percent: number): number => Math.round(percent) / 100;
