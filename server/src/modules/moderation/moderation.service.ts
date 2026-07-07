import { GraphQLError } from 'graphql';
import { moderateText, type ModerationViolation } from './moderation.rules';
import { aiModeratePod, type ModeratePodInput } from './moderation.ai';

export interface ModerationResult {
  allowed: boolean;
  violations: ModerationViolation[];
}

/** Deterministic pass over every text field — always runs, no OpenAI needed. */
function runRegexLayer(input: ModeratePodInput): ModerationViolation[] {
  const out: ModerationViolation[] = [];
  out.push(...moderateText('pod_title', input.pod_title ?? ''));
  out.push(...moderateText('pod_description', input.pod_description ?? ''));
  if (input.pod_info) out.push(...moderateText('pod_info', input.pod_info));
  for (const tag of input.pod_hashtag ?? []) {
    out.push(...moderateText('pod_hashtag', tag));
  }
  return out;
}

export const moderationService = {
  /**
   * Full advisory check used by the client preflight before publishing: the
   * deterministic regex layer (always) PLUS GPT-4o deep analysis of text +
   * images (when an OpenAI key is configured). Pod goes live only when
   * `allowed` is true.
   */
  async moderatePod(input: ModeratePodInput): Promise<ModerationResult> {
    const regex = runRegexLayer(input);
    const ai = await aiModeratePod(input);
    const violations = [...regex, ...ai];
    return { allowed: violations.length === 0, violations };
  },

  /**
   * Server-side hard guard invoked from pod creation so a crafted client cannot
   * bypass the explicit rules. Deterministic only (no AI cost/latency in the hot
   * path); throws with the violations attached when the text is not clean.
   */
  assertCleanOrThrow(input: ModeratePodInput): void {
    const violations = runRegexLayer(input);
    if (violations.length > 0) {
      throw new GraphQLError('Your pod content violates the community guidelines', {
        extensions: { code: 'POD_CONTENT_REJECTED', violations },
      });
    }
  },
};
