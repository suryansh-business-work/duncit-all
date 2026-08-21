import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
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

/** The pod's moderatable text, one field per line. Goes in as {{pod_fields}}. */
function podFields(input: ModeratePodInput): string {
  return [
    `Title: ${input.pod_title}`,
    `Description: ${input.pod_description}`,
    input.pod_info ? `Extra info: ${input.pod_info}` : '',
    input.pod_hashtag?.length ? `Hashtags: ${input.pod_hashtag.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The multimodal user turn: the operator-owned text block, then up to 4 image
 * parts. The images ride alongside the prompt rather than inside it — there is
 * no placeholder for a picture — so the library owns the wording and this owns
 * the attachments.
 */
function buildUserContent(text: string, imageUrls?: string[] | null): unknown[] {
  const parts: unknown[] = [{ type: 'text', text }];
  for (const url of (imageUrls ?? []).slice(0, 4)) {
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

interface ModerationCall {
  task: OpenAiTaskKey;
  /** The standing instruction. */
  systemKey: string;
  /** The turn that hands over what is being screened. */
  userKey: string;
  /** Values for the user turn's {{placeholders}}. */
  variables: Record<string, string>;
  imageUrls?: string[] | null;
  detail: string;
}

/**
 * Deep analysis of arbitrary content (text + images). Best-effort: returns []
 * when the OpenAI key is not configured or the call fails, so an AI outage never
 * blocks creation — the deterministic regex layer still catches the obvious
 * violations.
 *
 * BOTH turns come from the library, and so does the model. The user turn used to
 * be a template literal here, which meant an operator could rewrite "you are the
 * content-safety reviewer" but not "Review this pod:" — half a prompt they could
 * not see. The catalogue pins gpt-4o for vision; changing it in the AI portal
 * changes it here.
 */
async function callAiModeration(call: ModerationCall): Promise<ModerationViolation[]> {
  try {
    const [system, user] = await Promise.all([
      resolvePrompt(call.systemKey),
      resolvePrompt(call.userKey, call.variables),
    ]);
    const res = await openaiChat({
      task: call.task,
      detail: call.detail,
      model: system.model,
      temperature: 0,
      max_tokens: 800,
      json: true,
      messages: [
        { role: 'system', content: system.content },
        { role: 'user', content: buildUserContent(user.content, call.imageUrls) },
      ],
    });
    return res.ok ? parseAiViolations(res.content) : [];
  } catch {
    return [];
  }
}

export const aiModeratePod = (input: ModeratePodInput): Promise<ModerationViolation[]> =>
  callAiModeration({
    task: 'moderation.pod',
    systemKey: 'moderation.pod',
    userKey: 'moderation.pod.user',
    variables: { pod_fields: podFields(input) },
    imageUrls: input.image_urls,
    detail: input.pod_title,
  });

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

/** The product's moderatable text, one line per variant. Goes in as {{product_fields}}. */
function productFields(input: ModerateProductInput): string {
  const variantLines = (input.variants ?? []).flatMap((variant, index) => {
    const bits = [variant.option_label, variant.size_label, variant.description].filter(Boolean);
    return bits.length > 0 ? [`Variant ${index + 1}: ${bits.join(' — ')}`] : [];
  });
  return [`Product name: ${input.product_name}`, ...variantLines].join('\n');
}

export const aiModerateProduct = (input: ModerateProductInput): Promise<ModerationViolation[]> =>
  callAiModeration({
    task: 'moderation.product',
    systemKey: 'moderation.product',
    userKey: 'moderation.product.user',
    variables: { product_fields: productFields(input) },
    imageUrls: input.image_urls,
    detail: input.product_name,
  });

/**
 * Fast text-only check that a meeting cancel/reschedule reason is genuine.
 * Sends ONLY the reason text (no user data) to the default mini model for
 * minimal latency. Fail-open: returns true when the key is missing or the call
 * fails, so an AI outage never blocks a user from cancelling their meeting.
 */
export async function aiValidateMeetingReason(reason: string): Promise<boolean> {
  try {
    const system = await resolvePrompt('moderation.meeting_reason');
    const res = await openaiChat({
      task: 'moderation.meeting_reason',
      model: system.model,
      temperature: 0,
      max_tokens: 16,
      json: true,
      messages: [
        { role: 'system', content: system.content },
        // No library entry for this user turn: it is the reason the person typed,
        // verbatim, with no fixed wording around it to hand an operator.
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
