import { getRuntimeEnvValue } from '@config/runtimeEnv';
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

const SYSTEM_PROMPT = [
  'You are the content-safety reviewer for Duncit, a platform where hosts create social events ("pods").',
  'Review the pod a host wants to publish and flag anything that breaks community guidelines.',
  'Disallowed in ANY text field (title, description, info, hashtags): phone numbers, email addresses, external or payment links/URLs, payment handles (UPI, Paytm, GPay, PhonePe, bank/IFSC/QR), requests to contact off-platform, sexual/explicit/adult wording, hate speech, harassment, abusive or offensive language, scams, and illegal activity.',
  'Disallowed in images: nudity, sexual content, gore/graphic violence, or otherwise unsafe/unwanted imagery.',
  'Return STRICT JSON only, no markdown, of shape: {"violations":[{"field":string,"type":string,"message":string,"evidence":string}]}.',
  '"field" is one of: pod_title, pod_description, pod_info, pod_hashtag, image. "type" is a short SCREAMING_SNAKE code (e.g. PHONE, EMAIL, LINK, PAYMENT, ABUSE, NUDITY, HATE, SCAM). "message" tells the host in one sentence what to fix. "evidence" is the offending snippet (or the image URL). Return an empty array when everything is clean.',
].join('\n');

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
 * Deep GPT-4o analysis of the pod (text + images). Best-effort: returns [] when
 * the OpenAI key is not configured or the call fails, so an AI outage never
 * blocks pod creation — the deterministic regex layer still catches the obvious
 * violations. Uses the 'gpt-4o' model explicitly (NOT the OPENAI_MODEL default,
 * which is gpt-4o-mini) for the deepest analysis and vision support.
 */
export async function aiModeratePod(input: ModeratePodInput): Promise<ModerationViolation[]> {
  try {
    const [apiKey, baseUrl] = await Promise.all([
      getRuntimeEnvValue('OPENAI_API_KEY'),
      getRuntimeEnvValue('OPENAI_BASE_URL'),
    ]);
    if (!apiKey) return [];
    const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' as const },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserContent(input) },
        ],
      }),
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    return parseAiViolations(String(json?.choices?.[0]?.message?.content ?? ''));
  } catch {
    return [];
  }
}
