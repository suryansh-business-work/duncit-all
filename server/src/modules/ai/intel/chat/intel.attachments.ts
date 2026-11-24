import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { fenceUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import { logs } from '@observability/log';
import type { IntelActor } from '../access/intel.access';
import { canViewFile } from '../media/intelMedia.access';
import { extractDocumentText } from '../media/intelMedia.extract';
import { IntelMediaModel } from '../media/intelMedia.model';
import { readFile } from '../media/intelMedia.storage';
import { IntelMessageModel, type MessageAttachment } from './intelChat.models';

/**
 * Images and PDFs attached to a chat question. The files are uploaded to the
 * person's own Media library first (private), then named here by id; each one
 * is checked against the person's access before the model sees it. An image
 * goes to the model as the image itself (vision); a PDF as its text, fenced as
 * untrusted content like every other outside text.
 */

export const MAX_CHAT_ATTACHMENTS = 5;
const IMAGE_TYPES = /^image\/(?:png|jpe?g|webp|gif)$/;
const PDF_TYPE = 'application/pdf';
/** Larger images are refused by the model API anyway; past this the bytes are not sent. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** All attached PDFs together; the rest is cut with a note so one huge file cannot crowd out the question. */
const MAX_PDF_CHARS = 40_000;

export const isChatAttachmentType = (mime: string): boolean => IMAGE_TYPES.test(mime) || mime === PDF_TYPE;

const bad = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** The files a question names, checked: at most five, each an image or PDF the person may open. */
export async function resolveAttachments(actor: IntelActor, ids: readonly string[] | null | undefined): Promise<MessageAttachment[]> {
  const unique = [...new Set((ids ?? []).map(String))];
  if (unique.length === 0) return [];
  if (unique.length > MAX_CHAT_ATTACHMENTS) throw bad(`Attach at most ${MAX_CHAT_ATTACHMENTS} files to one message.`);
  if (unique.some((id) => !Types.ObjectId.isValid(id))) throw bad('One of the attached files does not exist.');
  const files = await IntelMediaModel.find({ _id: { $in: unique }, deleted_at: null }, { owner_id: 1, visibility: 1, name: 1, mime: 1 }).lean();
  const byId = new Map(files.map((f) => [String(f._id), f]));
  return unique.map((id) => {
    const file = byId.get(id);
    if (!file || !canViewFile(actor, file)) throw bad('One of the attached files does not exist or is not yours to use.');
    if (!isChatAttachmentType(file.mime)) throw bad(`“${file.name}” is not an image or a PDF.`);
    return { media_id: id, name: file.name, mime: file.mime };
  });
}

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'auto' } };

async function partFor(attachment: MessageAttachment, budget: { chars: number }): Promise<ContentPart> {
  const file = await IntelMediaModel.findById(attachment.media_id, { file_id: 1, size: 1, deleted_at: 1 }).lean();
  if (!file || file.deleted_at) return { type: 'text', text: `[The attached file “${attachment.name}” was deleted.]` };
  if (IMAGE_TYPES.test(attachment.mime)) {
    if (file.size > MAX_IMAGE_BYTES) return { type: 'text', text: `[The attached image “${attachment.name}” is too large to show (over 8 MB).]` };
    const data = await readFile(file.file_id);
    return { type: 'image_url', image_url: { url: `data:${attachment.mime};base64,${data.toString('base64')}`, detail: 'auto' } };
  }
  const extracted = await extractDocumentText(await readFile(file.file_id), PDF_TYPE, { ocr: false });
  const pages = extracted.pages.filter((p) => p.text.trim());
  if (pages.length === 0) return { type: 'text', text: `[The attached PDF “${attachment.name}” has no readable text${extracted.warning ? `: ${extracted.warning}` : ''}.]` };
  const text = pages.map((p) => `[page ${p.page}]\n${p.text}`).join('\n\n');
  const kept = text.slice(0, Math.max(budget.chars, 0));
  budget.chars -= kept.length;
  const cut = kept.length < text.length ? '\n[…the rest of this PDF was cut to fit]' : '';
  return { type: 'text', text: fenceUntrusted(`file:${attachment.name}`, `${kept}${cut}`) };
}

/**
 * What the model reads for the question: the text alone, or the text followed
 * by its attachments. A file that cannot be read is named, never silently
 * dropped, and the reason is logged.
 */
export async function questionContent(userMessageId: string, question: string): Promise<string | ContentPart[]> {
  const message = await IntelMessageModel.findById(userMessageId, { attachments: 1 }).lean();
  const attachments = message?.attachments ?? [];
  if (attachments.length === 0) return question;
  const budget = { chars: MAX_PDF_CHARS };
  const parts: ContentPart[] = [{ type: 'text', text: question }];
  for (const attachment of attachments) {
    try {
      parts.push(await partFor(attachment, budget));
    } catch (error) {
      logs.server.warn('intel', 'attachment', { error, media: attachment.media_id });
      parts.push({ type: 'text', text: `[The attached file “${attachment.name}” could not be read.]` });
    }
  }
  return parts;
}
