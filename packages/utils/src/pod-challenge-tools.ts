import { parseJsonObject } from './pod-challenge';

/**
 * Readers for the tools a challenge RUNS rather than scores by hand — checklist,
 * checkpoint, poll, quiz, buzzer, random picker and submissions. The server
 * sends each tool's settings (`config_json`) and what it currently shows
 * (`state_json`) as JSON strings; mWeb and the native app read them through
 * these, so both render the same thing from the same answer (rules 27/40).
 *
 * Nothing here decides anything: tallies, the buzz order, the open question
 * and who may act all arrive from the server. A malformed field reads as empty
 * rather than throwing, so one bad value never blanks a live arena.
 */

type Json = Record<string, unknown>;

/** The two JSON strings every reader works from. */
export interface ChallengeToolJson {
  config_json: string;
  state_json: string;
}

const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);
const objects = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isObject) : []);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : []);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const number = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const object = (value: unknown): Json => (isObject(value) ? value : {});

export interface ChallengeItem {
  key: string;
  label: string;
  points: number;
}

/** The tasks of a Checklist, or the checkpoints of a Checkpoint tool. */
export const challengeItems = (tool: Pick<ChallengeToolJson, 'config_json'>): ChallengeItem[] =>
  objects(parseJsonObject(tool.config_json).items).map((i) => ({ key: text(i.key), label: text(i.label), points: number(i.points) }));

/** The tasks or checkpoints one competitor has done. */
export const doneItemKeys = (tool: Pick<ChallengeToolJson, 'state_json'>, competitorId: string): string[] =>
  strings(object(parseJsonObject(tool.state_json).done)[competitorId]);

export interface ChallengePollResult {
  key: string;
  label: string;
  votes: number;
  /** Whole percent of all votes cast (0 while nobody has voted). */
  percent: number;
}

/** A poll's options with their tallies, in the order the host listed them. */
export function pollResults(tool: ChallengeToolJson): ChallengePollResult[] {
  const state = parseJsonObject(tool.state_json);
  const tallies = object(state.tallies);
  const total = number(state.total);
  return objects(parseJsonObject(tool.config_json).options).map((o) => {
    const votes = number(tallies[text(o.key)]);
    return { key: text(o.key), label: text(o.label), votes, percent: total > 0 ? Math.round((votes * 100) / total) : 0 };
  });
}

export interface ChallengeQuestion {
  key: string;
  label: string;
  options: string[];
  points: number;
  /** The right answer's position — only in a host's copy; null for everyone else. */
  correct: number | null;
}

/** A quiz's questions. Players never receive `correct`: the server strips it. */
export const challengeQuestions = (tool: Pick<ChallengeToolJson, 'config_json'>): ChallengeQuestion[] =>
  objects(parseJsonObject(tool.config_json).questions).map((q) => ({
    key: text(q.key),
    label: text(q.label),
    options: strings(q.options),
    points: number(q.points),
    correct: typeof q.correct === 'number' ? q.correct : null,
  }));

/** The question the host last opened (it stays on screen after answers close), if any. */
export function openQuestion(tool: ChallengeToolJson): ChallengeQuestion | null {
  const active = text(parseJsonObject(tool.state_json).active);
  return challengeQuestions(tool).find((q) => q.key === active) ?? null;
}

/** How many answers a question has received. */
export const answerCount = (tool: Pick<ChallengeToolJson, 'state_json'>, questionKey: string): number =>
  number(object(parseJsonObject(tool.state_json).answered)[questionKey]);

/** The competitors who buzzed in the current round, fastest first. */
export const buzzOrder = (tool: Pick<ChallengeToolJson, 'state_json'>): string[] => strings(parseJsonObject(tool.state_json).order);

/** The buzz round a press belongs to, as the viewer's own ballots are scoped (`r3`). */
export const buzzRoundScope = (tool: Pick<ChallengeToolJson, 'state_json'>): string =>
  `r${number(parseJsonObject(tool.state_json).round)}`;

/** The competitors drawn by a Random Picker so far, oldest first. */
export const pickedCompetitors = (tool: Pick<ChallengeToolJson, 'state_json'>): string[] =>
  strings(parseJsonObject(tool.state_json).picked);

export type ChallengeMediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

const MEDIA_TYPES: readonly ChallengeMediaType[] = ['IMAGE', 'VIDEO', 'AUDIO'];
const isMediaType = (value: unknown): value is ChallengeMediaType => MEDIA_TYPES.includes(value as ChallengeMediaType);

export interface ChallengeEntry {
  id: string;
  competitor_id: string;
  media_url: string;
  media_type: ChallengeMediaType;
  caption: string;
}

/** A Submission tool's gallery: one entry per competitor. */
export const challengeEntries = (tool: Pick<ChallengeToolJson, 'state_json'>): ChallengeEntry[] =>
  objects(parseJsonObject(tool.state_json).entries)
    .filter((e) => isMediaType(e.media_type))
    .map((e) => ({
      id: text(e.id),
      competitor_id: text(e.competitor_id),
      media_url: text(e.media_url),
      media_type: e.media_type as ChallengeMediaType,
      caption: text(e.caption),
    }));

/** The media a Submission tool takes: one kind when the host fixed it, otherwise all three. */
export function acceptedMediaTypes(tool: Pick<ChallengeToolJson, 'config_json'>): ChallengeMediaType[] {
  const kind = parseJsonObject(tool.config_json).media_kind;
  return isMediaType(kind) ? [kind] : [...MEDIA_TYPES];
}

/** Whether a Submission tool lets the competitor add a caption (on unless switched off). */
export const allowsCaption = (tool: Pick<ChallengeToolJson, 'config_json'>): boolean =>
  parseJsonObject(tool.config_json).allow_caption !== false;

/** The submission kind of a picked file, from its MIME type; null for anything a challenge cannot take. */
export function mediaTypeOfMime(mime: string | null | undefined): ChallengeMediaType | null {
  const raw = text(mime);
  const slash = raw.indexOf('/');
  const family = (slash < 0 ? raw : raw.slice(0, slash)).toUpperCase();
  return isMediaType(family) ? family : null;
}

/** The feature folder a submission is uploaded to; the server files it under the uploader. */
export const CHALLENGE_SUBMISSIONS_FOLDER = '/challenge-submissions';

/** The longest caption the server keeps. */
export const CHALLENGE_CAPTION_MAX = 200;

/** The query parameter a checkpoint's QR link carries (`?checkpoint=<tool>.<code>`). */
export const CHECKPOINT_PARAM = 'checkpoint';

export interface CheckpointScan {
  toolInstanceId: string;
  code: string;
}

/**
 * Reads a scanned checkpoint link's parameter. The code is whatever follows
 * the LAST dot, so a tool id that itself contains dots still parses.
 */
export function parseCheckpointParam(value: string | null | undefined): CheckpointScan | null {
  const raw = text(value);
  const at = raw.lastIndexOf('.');
  if (at <= 0 || at === raw.length - 1) return null;
  return { toolInstanceId: raw.slice(0, at), code: raw.slice(at + 1) };
}

/** Tools grouped by how they are fed (the server's `input_kind`), never by their name. */
export const toolsFedBy = <T extends { input_kind: string }>(tools: readonly T[], ...kinds: string[]): T[] =>
  tools.filter((t) => kinds.includes(t.input_kind));
