import { z } from 'zod';
import { isHostname, isSitePath, isUrlSlug } from '@duncit/regex';

/** Shared field rules for the CMS forms; every message is the caller's translation. */

const isHttps = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** A path on the site itself, like /legacy/main/logo.svg — never `//host`. */
const isSitePathUrl = (value: string) => value.startsWith('/') && !value.startsWith('//');

/** Blank, an https link, or a path on the site (images, canonical addresses, font stylesheets). */
export const httpsOrBlank = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || isHttps(value) || isSitePathUrl(value), message);

export const slugField = (message: string) => z.string().trim().toLowerCase().refine(isUrlSlug, message);

/** Blank (filled in from the title), or a slug. */
export const optionalSlug = (message: string) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || isUrlSlug(value), message);

export const sitePath = (message: string) => z.string().trim().toLowerCase().refine(isSitePath, message);

/** "duncit.com, www.duncit.com" → a clean, deduplicated list. */
export const splitList = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  ),
];

export const domainList = (message: string) =>
  z.string().refine((value) => splitList(value).every((domain) => isHostname(domain)), message);
