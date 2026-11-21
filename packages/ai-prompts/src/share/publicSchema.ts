import { z } from 'zod';
import { renderPrompt } from '../render';
import type { PromptVariable } from '../types';

/**
 * What a visitor to a shared prompt may type: a value for each placeholder,
 * and any extra instruction to send along. Long enough for a real paragraph,
 * short enough that the composed prompt still fits a chat box.
 */
export const MAX_VARIABLE_CHARS = 2000;
export const MAX_EXTRA_CHARS = 4000;

export interface PublicPromptMessages {
  required: string;
  tooLong: (max: number) => string;
}

export interface PublicPromptValues {
  values: Record<string, string>;
  extra: string;
}

/** Zod for the public form; built per prompt, because the fields are its placeholders. */
export function publicPromptSchema(messages: PublicPromptMessages, variables: readonly PromptVariable[]) {
  const field = (required: boolean) => {
    const text = z.string().max(MAX_VARIABLE_CHARS, messages.tooLong(MAX_VARIABLE_CHARS));
    return required ? text.trim().min(1, messages.required) : text;
  };
  return z.object({
    values: z.object(Object.fromEntries(variables.map((variable) => [variable.name, field(variable.required)]))),
    extra: z.string().max(MAX_EXTRA_CHARS, messages.tooLong(MAX_EXTRA_CHARS)),
  });
}

export const publicPromptDefaults = (variables: readonly PromptVariable[]): PublicPromptValues => ({
  values: Object.fromEntries(variables.map((variable) => [variable.name, ''])),
  extra: '',
});

/**
 * The prompt as it will be sent. A placeholder left blank stays written as
 * `{{name}}` rather than vanishing, so the reader can see what is still
 * missing; the extra input follows the prompt as its own paragraph.
 */
export function composePrompt(content: string, input: PublicPromptValues): string {
  const filled = Object.fromEntries(Object.entries(input.values).filter(([, value]) => value.trim() !== ''));
  const body = renderPrompt(content, filled);
  const extra = input.extra.trim();
  return extra ? `${body}\n\n${extra}` : body;
}
