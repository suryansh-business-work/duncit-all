/**
 * Which provider serves a model name, for the Ask Duncit chat loop.
 *
 * The chat loop streams and calls tools, which needs the OpenAI-compatible
 * chat/completions wire: OpenAI itself, and Google's OpenAI-compatible Gemini
 * endpoint (the same `gemini-` switch the shared funnel uses). Anything else is
 * refused when an operator saves it, rather than failing at the first message.
 */

export type ChatProvider = 'OPENAI' | 'GEMINI';

const OPENAI_MODEL = /^(gpt-|chatgpt-|o\d)/i;
const GEMINI_MODEL = /^gemini-/i;

export function chatProviderOf(model: string): ChatProvider | null {
  const name = model.trim();
  if (GEMINI_MODEL.test(name)) return 'GEMINI';
  if (OPENAI_MODEL.test(name)) return 'OPENAI';
  return null;
}

export const isSupportedChatModel = (model: string): boolean => chatProviderOf(model) !== null;

/** Models that read images and PDFs — attachments are refused on any other. */
const VISION_MODEL = /^(gpt-4o|gpt-4\.1|gpt-5|o\d|gemini-)/i;

export const supportsAttachments = (model: string): boolean => VISION_MODEL.test(model.trim());
