import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';

const { PLATFORM } = PROMPT_CATEGORIES;

const QUALITY_SITE = {
  file: 'server/src/modules/ai/prompt/prompt.quality.ts',
  surface: 'AI · Library > a prompt > Quality',
  trigger: 'A prompt is opened with no review of its current body yet, or someone presses "Rescore"',
} as const;

/**
 * The AI Library reviewing its own prompts.
 *
 * The rubric is a library row like any other, so whoever tunes the product's
 * prompts can also tune how they are judged — without a deploy.
 */
export const LIBRARY_PROMPTS = [
  {
    key: 'library.prompt_quality',
    name: 'Prompt quality reviewer',
    description: 'Scores an AI Library prompt out of 100 and says what to improve.',
    category: PLATFORM,
    role: 'SYSTEM',
    tasks: ['ai.prompt_quality'],
    target_model: '',
    variables: [],
    usage: [QUALITY_SITE],
    content: [
      'You are a senior prompt engineer reviewing a prompt that will be sent to a large language model.',
      'Judge it on: clarity of the task, role and audience; enough context and constraints; an explicit output format;',
      'handling of edge cases and missing input; no contradictions or ambiguity; safety against misuse and prompt injection;',
      'and economy (no padding that costs tokens without changing the answer).',
      'Words wrapped in double curly braces are placeholders filled in at run time — treat them as real values, not as mistakes.',
      'Return STRICT JSON only, no markdown, exactly this shape:',
      '{ "score": integer 0-100, "summary": string, "strengths": string[], "improvements": string[] }',
      'summary is one or two plain sentences. Give at most 5 strengths and at most 5 improvements, each under 160 characters,',
      'each improvement a concrete change the author can make. Use plain words — no emoji or other symbols.',
    ].join('\n'),
  },
  {
    key: 'library.prompt_quality.user',
    name: 'Prompt quality — the prompt under review',
    description: 'Hands over the prompt being scored, with its name and intended model.',
    category: PLATFORM,
    role: 'USER',
    tasks: ['ai.prompt_quality'],
    target_model: '',
    variables: [
      required('name', 'Prompt name', 'The name the prompt has in the library.', 'Pod moderation reviewer'),
      optional(
        'details',
        'Details',
        'Leading "Description: …" and "Target model: …" lines, each ending in a newline; empty when the prompt has neither.',
        'Description: Screens pods for policy violations.\nTarget model: gpt-4o-mini\n',
      ),
      required('prompt', 'Prompt body', 'The full prompt text being reviewed.', 'You are the content-safety reviewer…'),
    ],
    usage: [QUALITY_SITE],
    content: 'Review this prompt.\nName: {{name}}\n{{details}}\nPrompt:\n"""\n{{prompt}}\n"""',
  },
] as const satisfies readonly InAppPromptDef[];
