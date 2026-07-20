import { GraphQLError } from 'graphql';
import { moderateText, type ModerationViolation } from './moderation.rules';
import {
  aiModeratePod,
  aiModerateProduct,
  type ModeratePodInput,
  type ModerateProductInput,
} from './moderation.ai';

export interface ModerationResult {
  allowed: boolean;
  violations: ModerationViolation[];
}

/** Deterministic pass over every text field — always runs, no OpenAI needed. */
function runRegexLayer(input: ModeratePodInput): ModerationViolation[] {
  const out: ModerationViolation[] = [];
  out.push(
    ...moderateText('pod_title', input.pod_title ?? ''),
    ...moderateText('pod_description', input.pod_description ?? '')
  );
  if (input.pod_info) out.push(...moderateText('pod_info', input.pod_info));
  for (const tag of input.pod_hashtag ?? []) {
    out.push(...moderateText('pod_hashtag', tag));
  }
  return out;
}

/** Deterministic pass over a product's name + every variant's text. Field names
 * encode the client form path (e.g. `variants.2.description`) so a violation can
 * jump the brand straight to the offending input. */
function runProductRegexLayer(input: ModerateProductInput): ModerationViolation[] {
  const out: ModerationViolation[] = [];
  out.push(...moderateText('product_name', input.product_name ?? ''));
  (input.variants ?? []).forEach((variant, index) => {
    if (variant.option_label) out.push(...moderateText(`variants.${index}.option_label`, variant.option_label));
    if (variant.size_label) out.push(...moderateText(`variants.${index}.size_label`, variant.size_label));
    if (variant.description) out.push(...moderateText(`variants.${index}.description`, variant.description));
  });
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

  /** Advisory product check used by the partner-portal preflight before submit:
   * regex layer (always) + GPT-4o deep analysis of text + images (when keyed). */
  async moderateProduct(input: ModerateProductInput): Promise<ModerationResult> {
    const regex = runProductRegexLayer(input);
    const ai = await aiModerateProduct(input);
    const violations = [...regex, ...ai];
    return { allowed: violations.length === 0, violations };
  },

  /** Server-side hard guard invoked from product listing submit/update so a
   * crafted client cannot bypass the rules. Deterministic only (no AI in the hot
   * path); throws with the violations attached when the text is not clean. */
  assertProductCleanOrThrow(input: ModerateProductInput): void {
    const violations = runProductRegexLayer(input);
    if (violations.length > 0) {
      throw new GraphQLError('Your product content violates the community guidelines', {
        extensions: { code: 'PRODUCT_CONTENT_REJECTED', violations },
      });
    }
  },
};
