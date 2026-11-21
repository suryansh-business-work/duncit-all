import type { PromptVariable } from '../types';
import type { PromptPlatformId } from './platforms';

/**
 * The public share page's whole conversation with the server: read the shared
 * prompt, and report what the visitor did with it. Plain `fetch` against the
 * keyless `/ai-prompts/share/:token` routes — the visitor has no session, so
 * there is nothing for Apollo to add.
 */

/** A prompt as a stranger with the link sees it. */
export interface SharedPrompt {
  name: string;
  description: string;
  category: string;
  target_model: string;
  content: string;
  variables: PromptVariable[];
  token_count: number;
  updated_at: string | null;
}

export type PublicPromptEvent = 'PUBLIC_VIEW' | 'COPY_PROMPT' | 'OPEN_IN_PLATFORM' | 'COPY_SCRIPT';

/** An origin without its trailing slashes, in one linear pass (no backtracking pattern). */
function trimSlashes(origin: string): string {
  let end = origin.length;
  while (end > 0 && origin.charAt(end - 1) === '/') end -= 1;
  return origin.slice(0, end);
}

/** The address people are given: the AI portal's public page. */
export const publicShareUrl = (portalOrigin: string, token: string): string =>
  `${trimSlashes(portalOrigin)}/p/${encodeURIComponent(token)}`;

const shareEndpoint = (apiOrigin: string, token: string): string =>
  `${trimSlashes(apiOrigin)}/ai-prompts/share/${encodeURIComponent(token)}`;

/** Thrown when the link is off, archived, or never existed — the server does not say which. */
export class SharedPromptMissingError extends Error {
  constructor() {
    super('SHARED_PROMPT_NOT_FOUND');
    this.name = 'SharedPromptMissingError';
  }
}

export async function fetchSharedPrompt(apiOrigin: string, token: string, signal?: AbortSignal): Promise<SharedPrompt> {
  const res = await fetch(shareEndpoint(apiOrigin, token), { signal, headers: { Accept: 'application/json' } });
  if (res.status === 404) throw new SharedPromptMissingError();
  if (!res.ok) throw new Error(`SHARED_PROMPT_${res.status}`);
  return (await res.json()) as SharedPrompt;
}

const VISITOR_KEY = 'duncit.ai-prompts.visitor';

/**
 * A random id this browser keeps for itself, so "unique visitors" can be
 * counted without an account, an IP or a cookie. Storage can be blocked
 * (private mode, a strict browser); the visitor is then simply not counted as
 * the same person twice.
 */
export function visitorId(storage: Pick<Storage, 'getItem' | 'setItem'> = globalThis.localStorage): string | null {
  try {
    const known = storage.getItem(VISITOR_KEY);
    if (known) return known;
    const fresh = globalThis.crypto.randomUUID();
    storage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/** The campaign that brought the visitor, read from the page's own address. */
export const campaignSource = (search: string): string | null => new URLSearchParams(search).get('utm_source');

export interface PublicEventInput {
  type: PublicPromptEvent;
  platform?: PromptPlatformId;
}

/**
 * Report one interaction. Fire-and-forget with `keepalive`, so an "Open in
 * Claude" that navigates away still lands. A failed report is reported back as
 * `false` for the caller to log — never thrown into the visitor's way.
 */
export async function reportPublicEvent(apiOrigin: string, token: string, input: PublicEventInput): Promise<boolean> {
  try {
    const res = await fetch(`${shareEndpoint(apiOrigin, token)}/events`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: input.type,
        platform: input.platform ?? null,
        source: campaignSource(globalThis.location.search),
        referrer: globalThis.document.referrer || null,
        visitor: visitorId(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
