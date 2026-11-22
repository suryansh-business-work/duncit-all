import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { ATTACHMENT_KINDS, type AttachmentKind, type MessageAttachment } from '../conversation/askDuncitMessage.model';
import { fenceUntrusted, flagIds, inspectUntrusted } from '../guard/askDuncit.guard';

/**
 * Files, images and PDFs attached to a question.
 *
 * The app uploads to ImageKit first (the shared upload flow) and sends the
 * URL. Only URLs on the configured ImageKit endpoint are accepted — the server
 * never fetches an arbitrary address a client names (SSRF). Images go to the
 * model by URL; PDFs and text files are fetched (size-capped) and sent inline.
 * Text read from a file is fenced as untrusted and scanned for injected
 * instructions; a PDF or image is read by the model itself, under the same
 * "data, not instructions" rule in the system prompt.
 */

export interface AttachmentInput {
  url: string;
  kind?: string | null;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
}

export interface PreparedAttachments {
  stored: MessageAttachment[];
  /** Content parts appended to the user's turn. */
  parts: Array<Record<string, unknown>>;
  /** Injection flags found in file text (for the violation log). */
  flags: string[];
}

const TEXT_MIME = /^(text\/|application\/(json|csv|xml))/i;

const bad = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

export function kindOf(input: AttachmentInput): AttachmentKind {
  if (input.kind && (ATTACHMENT_KINDS as readonly string[]).includes(input.kind)) return input.kind as AttachmentKind;
  const mime = (input.mime ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

/** True when the URL is on the ImageKit endpoint this deployment uploads to. */
export function isTrustedUploadUrl(url: string, endpoint: string): boolean {
  if (!endpoint) return false;
  try {
    const target = new URL(url);
    const base = new URL(endpoint);
    return target.protocol === 'https:' && target.host === base.host && target.pathname.startsWith(base.pathname.replace(/\/$/, '') + '/');
  } catch {
    return false;
  }
}

async function fetchCapped(url: string, maxBytes: number): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'error' });
  if (!res.ok) throw bad('An attached file could not be read. Upload it again.');
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw bad('An attached file is too large.');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > maxBytes) throw bad('An attached file is too large.');
  return buffer;
}

export async function prepareAttachments(
  inputs: readonly AttachmentInput[],
  limits: { maxFiles: number; maxMb: number }
): Promise<PreparedAttachments> {
  if (!inputs.length) return { stored: [], parts: [], flags: [] };
  if (inputs.length > limits.maxFiles) throw bad(`Attach at most ${limits.maxFiles} files.`);
  const endpoint = (await getRuntimeEnvValue('IMAGEKIT_URL_ENDPOINT')).trim();
  const maxBytes = Math.round(limits.maxMb * 1024 * 1024);
  const result: PreparedAttachments = { stored: [], parts: [], flags: [] };
  for (const input of inputs) {
    const url = String(input.url ?? '').trim();
    if (!isTrustedUploadUrl(url, endpoint)) throw bad('Attachments must be uploaded through the app.');
    const kind = kindOf(input);
    const name = String(input.name ?? '').slice(0, 120) || 'file';
    const mime = String(input.mime ?? '').slice(0, 100);
    if ((input.size ?? 0) > maxBytes) throw bad('An attached file is too large.');
    result.stored.push({ url, kind, name, mime, size: Math.max(0, Number(input.size) || 0) });
    if (kind === 'IMAGE') {
      result.parts.push({ type: 'image_url', image_url: { url, detail: 'auto' } });
    } else if (kind === 'PDF') {
      const data = (await fetchCapped(url, maxBytes)).toString('base64');
      result.parts.push({ type: 'file', file: { filename: name, file_data: `data:application/pdf;base64,${data}` } });
    } else if (TEXT_MIME.test(mime)) {
      const text = (await fetchCapped(url, maxBytes)).toString('utf8').slice(0, 20_000);
      const flags = inspectUntrusted(text);
      result.flags.push(...flagIds(flags));
      result.parts.push({ type: 'text', text: fenceUntrusted(`file:${name}`, text, flags.length > 0) });
    } else {
      result.parts.push({ type: 'text', text: `[Attached file "${name}" (${mime || 'unknown type'}) — its content cannot be read here.]` });
    }
  }
  return result;
}
