import { getSystemPrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import type { ModerationViolation } from './moderation.rules';

/** Pod content submitted for moderation. `image_urls` are the uploaded cover
 * images so GPT-4o can screen them for nudity / unwanted imagery. */
export interface ModeratePodInput {
  pod_title: string;
  pod_description: string;
  pod_info?: string | null;
  pod_hashtag?: string[] | null;
  image_urls?: string[] | null;
}

/** Build the multimodal user turn: the text block + up to 4 image parts. */
function buildUserContent(input: ModeratePodInput): unknown[] {
  const lines = [
    `Title: ${input.pod_title}`,
    `Description: ${input.pod_description}`,
    input.pod_info ? `Extra info: ${input.pod_info}` : '',
    input.pod_hashtag?.length ? `Hashtags: ${input.pod_hashtag.join(', ')}` : '',
  ].filter(Boolean);
  const parts: unknown[] = [{ type: 'text', text: `Review this pod:\n${lines.join('\n')}` }];
  for (const url of (input.image_urls ?? []).slice(0, 4)) {
    if (/^https?:\/\//i.test(url)) parts.push({ type: 'image_url', image_url: { url } });
  }
  return parts;
}

function parseAiViolations(content: string): ModerationViolation[] {
  try {
    const parsed = JSON.parse(content) as { violations?: unknown };
    if (!Array.isArray(parsed.violations)) return [];
    return parsed.violations
      .filter((v: any) => v && typeof v.field === 'string' && typeof v.message === 'string')
      .map((v: any) => ({
        field: v.field,
        step: 'AI' as const,
        type: typeof v.type === 'string' && v.type ? v.type : 'POLICY',
        message: v.message,
        evidence: typeof v.evidence === 'string' ? v.evidence : null,
      }));
  } catch {
    return [];
  }
}

/**
 * Deep GPT-4o analysis of arbitrary content (text + images). Best-effort:
 * returns [] when the OpenAI key is not configured or the call fails, so an AI
 * outage never blocks creation — the deterministic regex layer still catches the
 * obvious violations. Uses the 'gpt-4o' model explicitly (NOT the OPENAI_MODEL
 * default, which is gpt-4o-mini) for the deepest analysis and vision support.
 */
async function callAiModeration(
  task: OpenAiTaskKey,
  promptKey: string,
  userContent: unknown[],
  detail: string,
): Promise<ModerationViolation[]> {
  try {
    const res = await openaiChat({
      task,
      detail,
      // NOT the OPENAI_MODEL default (gpt-4o-mini) — the deepest analysis, with vision.
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 800,
      json: true,
      messages: [
        { role: 'system', content: await getSystemPrompt(promptKey) },
        { role: 'user', content: userContent },
      ],
    });
    return res.ok ? parseAiViolations(res.content) : [];
  } catch {
    return [];
  }
}

export const aiModeratePod = (input: ModeratePodInput): Promise<ModerationViolation[]> =>
  callAiModeration('moderation.pod', 'moderation.pod', buildUserContent(input), input.pod_title);

/** One variant's moderatable text (labels + description). */
export interface ModerateProductVariant {
  option_label?: string | null;
  size_label?: string | null;
  description?: string | null;
}

/** Product content submitted for moderation. `image_urls` are the union of every
 * variant's images so GPT-4o can screen them. */
export interface ModerateProductInput {
  product_name: string;
  variants?: ModerateProductVariant[] | null;
  image_urls?: string[] | null;
}

function buildProductUserContent(input: ModerateProductInput): unknown[] {
  const variantLines = (input.variants ?? []).flatMap((variant, index) => {
    const bits = [variant.option_label, variant.size_label, variant.description].filter(Boolean);
    return bits.length > 0 ? [`Variant ${index + 1}: ${bits.join(' — ')}`] : [];
  });
  const lines = [`Product name: ${input.product_name}`, ...variantLines];
  const parts: unknown[] = [{ type: 'text', text: `Review this product:\n${lines.join('\n')}` }];
  for (const url of (input.image_urls ?? []).slice(0, 4)) {
    if (/^https?:\/\//i.test(url)) parts.push({ type: 'image_url', image_url: { url } });
  }
  return parts;
}

export const aiModerateProduct = (input: ModerateProductInput): Promise<ModerationViolation[]> =>
  callAiModeration(
    'moderation.product',
    'moderation.product',
    buildProductUserContent(input),
    input.product_name
  );

/**
 * Fast text-only check that a meeting cancel/reschedule reason is genuine.
 * Sends ONLY the reason text (no user data) to the default mini model for
 * minimal latency. Fail-open: returns true when the key is missing or the call
 * fails, so an AI outage never blocks a user from cancelling their meeting.
 */
export async function aiValidateMeetingReason(reason: string): Promise<boolean> {
  try {
    const res = await openaiChat({
      task: 'moderation.meeting_reason',
      temperature: 0,
      max_tokens: 16,
      json: true,
      messages: [
        { role: 'system', content: await getSystemPrompt('moderation.meeting_reason') },
        { role: 'user', content: reason },
      ],
    });
    if (!res.ok) return true;
    const parsed = JSON.parse(res.content) as { valid?: unknown };
    return parsed.valid !== false;
  } catch {
    return true;
  }
}
