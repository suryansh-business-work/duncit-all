import { openaiChat } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { signedPrivateUrl } from '@modules/platform/upload/privateMedia';
import type { ICaseVerification, IEvidenceFile } from './failedPaymentCase.model';
import { EVIDENCE_LINK_SECONDS, type EvidenceType } from './failedPayment.types';

/**
 * Reading a payment screenshot with OpenAI vision (AI feature
 * `finance.payment_evidence`). The model only extracts what is printed; it
 * decides nothing. Every failure — feature switched off, no key, an outage, an
 * unreadable answer — comes back as `ok: false`, which the caller turns into a
 * yellow UNMATCHED case for a person. The model is shown the private files
 * through links that expire within minutes.
 */

export type Extracted = NonNullable<ICaseVerification['extracted']>;

export type ExtractResult =
  | { ok: true; extracted: Extracted; confidence: number | null; rawAmount: string }
  | { ok: false; reason: string };

const str = (value: unknown, max = 120): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** The model's JSON, read defensively. Pure, for tests. */
export function parseExtraction(content: string): ExtractResult {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'The AI answer could not be read.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'The AI answer could not be read.' };
  const amountText = typeof raw.amount === 'number' ? String(raw.amount) : str(raw.amount, 40);
  const amount = Number(amountText.replaceAll(/[^0-9.]/g, ''));
  const confidence = typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : null;
  return {
    ok: true,
    rawAmount: amountText,
    confidence,
    extracted: {
      payment_id: str(raw.payment_id, 60),
      utr: str(raw.utr, 60),
      amount: amountText && Number.isFinite(amount) && amount > 0 ? amount : null,
      date: str(raw.date, 60),
      status: str(raw.status, 60),
      payee: str(raw.payee, 120),
    },
  };
}

export async function extractFromImages(args: {
  files: readonly IEvidenceFile[];
  evidenceType: EvidenceType;
  amountLabel: string;
  caseId: string;
}): Promise<ExtractResult> {
  const images = args.files.filter((f) => f.kind === 'IMAGE');
  if (images.length === 0) return { ok: false, reason: 'No image to read.' };
  try {
    const links = await Promise.all(images.map((f) => signedPrivateUrl(f.file_ref, EVIDENCE_LINK_SECONDS)));
    const [system, user] = await Promise.all([
      resolvePrompt('finance.payment_evidence'),
      resolvePrompt('finance.payment_evidence.user', { amount: args.amountLabel, evidence_type: args.evidenceType }),
    ]);
    const res = await openaiChat({
      task: 'finance.payment_evidence',
      detail: `case:${args.caseId}`,
      model: system.model || undefined,
      temperature: 0,
      max_tokens: 300,
      json: true,
      messages: [
        { role: 'system', content: system.content },
        {
          role: 'user',
          content: [
            { type: 'text', text: user.content },
            ...links.map((link) => ({ type: 'image_url', image_url: { url: link.url } })),
          ],
        },
      ],
    });
    if (!res.ok) return { ok: false, reason: `AI unavailable (${res.code}).` };
    return parseExtraction(res.content);
  } catch (error) {
    return { ok: false, reason: `AI check failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300) };
  }
}
