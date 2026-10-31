import { PUBLISH_RULES } from '@modules/crm/marketing/social/social.rules';
import type { SocialPlatform } from '@modules/crm/marketing/social/social.types';
import { REEL_LIMITS, specDurationMs, type ReelSpec } from './reel.edit';
import type { ReelAsset, ReelCheck } from './reel.model';

/**
 * Is this reel ready for these networks? Each check is one line with a pass
 * and the reason, so the studio can show them as a list and the operator can
 * fix what is red. The limits are the networks' published reel limits; the
 * text limits are the sanitizer's own, repeated here as a check so the list
 * is complete rather than silently true.
 */

/** How long a reel may be on each network, in milliseconds. */
export const REEL_PLATFORM_MAX_MS: Record<SocialPlatform, number> = {
  INSTAGRAM: 90_000,
  FACEBOOK: 90_000,
  THREADS: 90_000,
  YOUTUBE: 60_000,
  LINKEDIN: 600_000,
  X: 140_000,
};

/** The networks whose reel surface is portrait only. */
const PORTRAIT_ONLY: readonly SocialPlatform[] = ['INSTAGRAM', 'YOUTUBE', 'THREADS'];

/** The hook must land in the first moment: a text that starts within this of the scene's start. */
const HOOK_START_MS = 500;
const HOOK_MIN_SCENE_MS = 1500;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const label = (platform: SocialPlatform) => PUBLISH_RULES[platform].label;

function durationChecks(spec: ReelSpec, platforms: readonly SocialPlatform[]): ReelCheck[] {
  const total = specDurationMs(spec);
  return platforms.map((platform) => {
    const max = REEL_PLATFORM_MAX_MS[platform];
    if (total === 0) return { name: `duration:${platform}`, pass: false, detail: `The reel has no scenes yet; ${label(platform)} allows up to ${seconds(max)}.` };
    const pass = total <= max;
    return {
      name: `duration:${platform}`,
      pass,
      detail: pass
        ? `${seconds(total)} of the ${seconds(max)} ${label(platform)} allows.`
        : `${seconds(total)} is over the ${seconds(max)} ${label(platform)} allows — cut ${seconds(total - max)}.`,
    };
  });
}

function aspectChecks(spec: ReelSpec, platforms: readonly SocialPlatform[]): ReelCheck[] {
  return platforms
    .filter((platform) => PORTRAIT_ONLY.includes(platform))
    .map((platform) => ({
      name: `aspect:${platform}`,
      pass: spec.aspect === 'PORTRAIT',
      detail: spec.aspect === 'PORTRAIT' ? `Portrait, as ${label(platform)} wants.` : `${label(platform)} shows reels in portrait; this reel is ${spec.aspect.toLowerCase()}.`,
    }));
}

function soundCheck(spec: ReelSpec, byId: ReadonlyMap<string, ReelAsset>): ReelCheck {
  if (spec.voiceover) return { name: 'sound', pass: true, detail: 'A voiceover plays under the reel.' };
  if (spec.music) return { name: 'sound', pass: true, detail: 'Music plays under the reel.' };
  const live = spec.scenes.some((scene) => scene.volume > 0 && byId.get(scene.asset_id)?.kind === 'VIDEO');
  return live
    ? { name: 'sound', pass: true, detail: 'At least one clip plays its own sound.' }
    : { name: 'sound', pass: false, detail: 'Silent — add music or a voiceover, or turn a clip’s volume up.' };
}

function textCheck(spec: ReelSpec): ReelCheck {
  const crowded = spec.scenes.filter((scene) => scene.texts.length > REEL_LIMITS.maxTexts).length;
  const long = spec.scenes.flatMap((scene) => scene.texts).filter((text) => text.text.length > REEL_LIMITS.maxTextLength).length;
  if (crowded === 0 && long === 0) {
    return { name: 'text', pass: true, detail: `Every text is within ${REEL_LIMITS.maxTextLength} characters and no scene carries more than ${REEL_LIMITS.maxTexts}.` };
  }
  const reasons = [
    crowded > 0 ? `${crowded} scene(s) carry more than ${REEL_LIMITS.maxTexts} texts` : '',
    long > 0 ? `${long} text(s) run past ${REEL_LIMITS.maxTextLength} characters` : '',
  ].filter(Boolean);
  return { name: 'text', pass: false, detail: `${reasons.join('; ')}.` };
}

function hookCheck(spec: ReelSpec): ReelCheck {
  const first = spec.scenes[0];
  if (!first) return { name: 'hook', pass: false, detail: 'The reel has no scenes yet.' };
  const hook = first.texts.find((text) => text.start_ms <= HOOK_START_MS);
  if (!hook) return { name: 'hook', pass: false, detail: 'The first scene has no text at its start — open on a line that makes people stay.' };
  if (first.duration_ms < HOOK_MIN_SCENE_MS) {
    return { name: 'hook', pass: false, detail: `The first scene lasts ${seconds(first.duration_ms)}; give the hook at least ${seconds(HOOK_MIN_SCENE_MS)}.` };
  }
  return { name: 'hook', pass: true, detail: `Opens on “${hook.text.slice(0, 60)}” for ${seconds(first.duration_ms)}.` };
}

function watermarkCheck(spec: ReelSpec, byId: ReadonlyMap<string, ReelAsset>): ReelCheck {
  const asset = byId.get(spec.brand.watermark_asset_id);
  if (!asset) return { name: 'watermark', pass: false, detail: 'No brand watermark — set one under Brand so the reel carries the mark everywhere it goes.' };
  return { name: 'watermark', pass: true, detail: `${asset.name} in the ${spec.brand.watermark_corner.toLowerCase().replace('_', ' ')}.` };
}

/** Every check for these networks, in the order the studio lists them. */
export function reelChecks(spec: ReelSpec, assets: readonly ReelAsset[], platforms: readonly SocialPlatform[]): ReelCheck[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const wanted = [...new Set(platforms)];
  return [
    ...durationChecks(spec, wanted),
    ...aspectChecks(spec, wanted),
    soundCheck(spec, byId),
    textCheck(spec),
    hookCheck(spec),
    watermarkCheck(spec, byId),
  ];
}
