import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { logs } from '@observability/log';
import type { RunContext } from '@modules/crm/marketing/runs/marketingRun.service';
import { REEL_LIMITS, sanitizeSpec, type ReelScene, type ReelSpec, type ReelText } from './reel.edit';
import { ReelProjectModel, type IReelProject, type ReelAsset, type ReelMessage } from './reel.model';
import { assertRoom, badInput, load, notFound, reelRun, shortId, toPub, type ReelActor } from './reel.shared';
import { searchReelMedia, stockAsset, type ReelMediaItem } from './reel.stock';

/**
 * A script laid on the timeline. One scene per script scene, each on the best
 * footage available: a clip or picture of the project whose name matches the
 * scene's query words, else — when asked — the first portrait stock result,
 * added to the project as a STOCK asset, else a colour card that carries the
 * line as its title. The result is a spec like any chat reply's: sanitized,
 * saved with a message, and restorable.
 */

export interface ReelScriptScene {
  text: string;
  shot: string;
  duration_ms: number;
  asset_query: string;
}

export interface ReelScriptInput {
  hooks: string[];
  scenes: ReelScriptScene[];
  cta: string;
}

const MAX_HOOKS = 5;
const MAX_SHOT = 200;
const MAX_QUERY = 80;
const DEFAULT_SCENE_MS = 3000;
/** The transcript kept per reel — the same ceiling the chat keeps. */
const MAX_MESSAGES = 200;
const STORYBOARD_MESSAGE = 'Storyboard applied';
const WHITE = '#FFFFFF';
/** Words too short to say what a picture is ("a", "of", "on"). */
const MIN_WORD = 3;

type Raw = Record<string, unknown>;
const record = (value: unknown): Raw | null => (typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : null);
const asText = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

function clampMs(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return DEFAULT_SCENE_MS;
  return Math.round(Math.min(REEL_LIMITS.maxSceneMs, Math.max(REEL_LIMITS.minSceneMs, parsed)));
}

function sanitizeScene(raw: unknown): ReelScriptScene[] {
  const item = record(raw);
  if (!item) return [];
  const text = asText(item.text, REEL_LIMITS.maxTextLength);
  const shot = asText(item.shot, MAX_SHOT);
  const asset_query = asText(item.asset_query, MAX_QUERY);
  // A scene with neither a line nor a picture to find is nothing to lay down.
  if (!text && !shot && !asset_query) return [];
  return [{ text, shot, duration_ms: clampMs(item.duration_ms), asset_query }];
}

/** A script — the model's answer or the portal's edited copy — within the reel's limits. */
export function sanitizeScript(raw: unknown): ReelScriptInput {
  const item = record(raw) ?? {};
  const hooks = (Array.isArray(item.hooks) ? item.hooks : []).map((hook) => asText(hook, REEL_LIMITS.maxTextLength)).filter(Boolean).slice(0, MAX_HOOKS);
  const scenes = (Array.isArray(item.scenes) ? item.scenes : []).flatMap(sanitizeScene).slice(0, REEL_LIMITS.maxScenes);
  return { hooks, scenes, cta: asText(item.cta, REEL_LIMITS.maxTextLength) };
}

/* ------------------------------- matching ------------------------------- */

const wordsOf = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_WORD);

/**
 * The project's clip or picture whose name shares the most words with the
 * query; an asset not yet used by the storyboard wins a tie, so a reel does
 * not open on the same clip three times.
 */
function matchAsset(query: string, assets: readonly ReelAsset[], used: ReadonlySet<string>): ReelAsset | null {
  const wanted = wordsOf(query);
  if (wanted.length === 0) return null;
  let best: { asset: ReelAsset; score: number } | null = null;
  for (const asset of assets) {
    if (asset.kind === 'AUDIO') continue;
    const have = new Set(wordsOf(asset.name));
    const score = wanted.filter((word) => have.has(word)).length * 2 + (used.has(asset.id) ? 0 : 1);
    if (score > 1 && (!best || score > best.score)) best = { asset, score };
  }
  return best?.asset ?? null;
}

const text = (value: string, style: ReelText['style'], position: ReelText['position']): ReelText => ({
  id: shortId(),
  text: value,
  style,
  position,
  animation: 'FADE',
  start_ms: 0,
  duration_ms: 0,
  color: WHITE,
  background: '',
});

/* ------------------------------- stock lookup --------------------------- */

/** The assets found, in scene order; null where nothing was found or the lookup was skipped. */
type StockLookup = (ReelAsset | null)[];

/** The first portrait stock result for a query: a clip when there is one, else a photo. */
async function firstStock(query: string, aspect: ReelSpec['aspect']): Promise<ReelMediaItem | null> {
  const clips = await searchReelMedia({ query, kind: 'VIDEO', orientation: aspect, perPage: 1 });
  if (clips.items[0]) return clips.items[0];
  const photos = await searchReelMedia({ query, kind: 'IMAGE', orientation: aspect, perPage: 1 });
  return photos.items[0] ?? null;
}

const PEXELS_SEARCH_URL = 'https://api.pexels.com/videos/search';

/** One scene's lookup, recorded on the run's API log whichever way it went. */
async function lookupOne(run: RunContext, query: string, aspect: ReelSpec['aspect']): Promise<ReelAsset | null> {
  const started = Date.now();
  try {
    const item = await firstStock(query, aspect);
    await run.api({ service: 'Pexels', method: 'GET', url: PEXELS_SEARCH_URL, status: 200, ms: Date.now() - started, summary: `${query} → ${item ? item.attribution : 'nothing'}` });
    return item ? stockAsset({ ...item, name: `${query} (${item.kind === 'VIDEO' ? 'stock clip' : 'stock photo'})` }) : null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await run.api({ service: 'Pexels', method: 'GET', url: PEXELS_SEARCH_URL, status: 0, ms: Date.now() - started, summary: `${query} → ${reason.slice(0, 200)}` });
    logs.server.warn('reel', 'storyboard-stock', { error, query });
    throw error;
  }
}

/**
 * Stock for every scene that still needs a picture, under one recorded step.
 * One query failing costs that scene its picture, not the storyboard — what
 * the other queries found is kept and the step is marked failed, so the run
 * reads PARTIAL. The library not being set up at all stops the lookups after
 * the first refusal.
 */
async function lookupStock(run: RunContext, queries: readonly (string | null)[], aspect: ReelSpec['aspect']): Promise<StockLookup> {
  const wanted = queries.filter((query): query is string => query !== null);
  const found: StockLookup = queries.map(() => null);
  const failures: string[] = [];
  if (wanted.length === 0) return found;
  await run
    .step(
      'stock',
      `Stock footage for ${wanted.length} scene${wanted.length === 1 ? '' : 's'}`,
      async () => {
        let refused = false;
        for (const [index, query] of queries.entries()) {
          if (query === null || refused) continue;
          try {
            found[index] = await lookupOne(run, query, aspect);
          } catch (error) {
            refused = error instanceof GraphQLError && error.extensions.code === 'CONFIG_ERROR';
            failures.push(`${query}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        if (failures.length > 0) throw new Error(`${failures.length} of ${wanted.length} stock lookups failed — ${failures[0]}`);
        return found.filter(Boolean).length;
      },
      { tool: 'pexels.search', input_summary: wanted.join(' | ').slice(0, 200), summarize: (count) => `${count} found` }
    )
    .catch((error: unknown) => {
      // The step is recorded as failed; the storyboard still lands, on cards where stock was missing.
      logs.server.warn('reel', 'storyboard-stock-step', { error });
    });
  return found;
}

/* --------------------------------- layout ------------------------------- */

interface Placement {
  asset: ReelAsset | null;
  stock: boolean;
}

/** Which footage each scene gets: a match from the project, else stock when allowed, else a card. */
async function placeScenes(run: RunContext, doc: IReelProject, script: ReelScriptInput, autoMedia: boolean, aspect: ReelSpec['aspect']): Promise<Placement[]> {
  const used = new Set<string>();
  const matched = await run.step('match', 'Match scenes to the reel’s footage', async () =>
    script.scenes.map((scene) => {
      const asset = matchAsset(scene.asset_query || scene.shot, doc.assets, used);
      if (asset) used.add(asset.id);
      return asset;
    }),
    { summarize: (found) => `${found.filter(Boolean).length} of ${script.scenes.length} matched` }
  );
  // Only a scene that names what to look for goes to the library; a shot note is for the editor, not a search.
  const queries = script.scenes.map((scene, index) => (matched[index] || !autoMedia ? null : scene.asset_query || null));
  // Refuse before the library is asked, not after: a reel that is full cannot take what the lookups would bring.
  assertRoom(doc, queries.filter((query) => query !== null).length);
  const stock = await lookupStock(run, queries, aspect);
  return script.scenes.map((_scene, index) => {
    const found = stock[index];
    return found ? { asset: found, stock: true } : { asset: matched[index], stock: false };
  });
}

function sceneOf(scene: ReelScriptScene, index: number, placement: Placement, script: ReelScriptInput): Partial<ReelScene> {
  const line = index === 0 ? scene.text || script.hooks[0] || '' : scene.text;
  const last = index === script.scenes.length - 1;
  const texts: ReelText[] = [];
  if (line) texts.push(placement.asset ? text(line, 'SUBTITLE', 'BOTTOM') : text(line, 'TITLE', 'CENTER'));
  if (last && script.cta && script.cta !== line) texts.push(text(script.cta, 'TITLE', 'CENTER'));
  return {
    id: shortId(),
    asset_id: placement.asset?.id ?? '',
    duration_ms: scene.duration_ms,
    volume: 0,
    fit: 'COVER',
    motion: placement.asset?.kind === 'IMAGE' ? 'ZOOM_IN' : 'NONE',
    transition: index === 0 ? 'NONE' : 'FADE',
    texts,
    overlays: [],
  };
}

/* ---------------------------------- apply ------------------------------- */

/** The stock assets a storyboard brought in — the placements that were found in the library. */
const stockOf = (placements: readonly Placement[]): ReelAsset[] =>
  placements.flatMap((placement) => (placement.stock && placement.asset ? [placement.asset] : []));

export async function applyReelStoryboard(projectId: string, scriptInput: ReelScriptInput, autoMedia: boolean | null | undefined, actor: ReelActor) {
  const script = sanitizeScript(scriptInput);
  if (script.scenes.length === 0) throw badInput('The script has no scenes to lay down.');
  const doc = await load(projectId);
  const current = sanitizeSpec(doc.spec, doc.assets);
  const { spec, added } = await reelRun(doc, `Storyboard for "${doc.name}" — ${script.scenes.length} scenes`, actor, async (run) => {
    const placements = await placeScenes(run, doc, script, !!autoMedia, current.aspect);
    const stock = stockOf(placements);
    const written = await run.step(
      'spec',
      'Write the edit',
      async () => {
        const scenes = script.scenes.map((scene, index) => sceneOf(scene, index, placements[index], script));
        return sanitizeSpec({ ...current, scenes }, [...doc.assets, ...stock]);
      },
      { summarize: (result) => `${result.scenes.length} scenes, ${result.scenes.filter((scene) => scene.asset_id === '').length} cards` }
    );
    return { spec: written, added: stock };
  });
  const message: ReelMessage = { id: shortId(), role: 'ASSISTANT', text: STORYBOARD_MESSAGE, asset_ids: added.map((asset) => asset.id), spec, failed: false, at: new Date() };
  // One update, like a chat reply: the operator may have edited meanwhile, and the spec is re-sanitized on every read.
  const update: mongoose.UpdateQuery<IReelProject> = {
    $set: { spec, updated_by: actor.email },
    $push: { messages: { $each: [message], $slice: -MAX_MESSAGES }, ...(added.length > 0 ? { assets: { $each: added } } : {}) },
  };
  const updated = await ReelProjectModel.findByIdAndUpdate(doc._id, update, { new: true });
  if (!updated) throw notFound();
  return toPub(updated);
}
