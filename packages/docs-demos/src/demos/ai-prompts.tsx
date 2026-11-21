import {
  PROMPT_PLATFORMS,
  braced,
  composePrompt,
  estimateTokens,
  exampleValues,
  extractVariables,
  injectionScript,
  missingRequiredVariables,
  platformLink,
  publicShareUrl,
  renderPrompt,
  type PromptVariable,
  type PublicPromptValues,
} from '@duncit/ai-prompts';
import { defineDemo, defineDemos } from '../types';

interface ShareMock {
  /** The shared prompt's body. */
  content: string;
  /** What a visitor typed on the public page. */
  input: PublicPromptValues;
  /** The share token from the link. */
  token: string;
}

interface PromptMock {
  /** A prompt body exactly as the AI Library stores it. */
  content: string;
  /** What the catalogue declares this prompt needs. */
  variables: PromptVariable[];
}

export default defineDemos('ai-prompts', [
  defineDemo<PromptMock>({
    id: 'render',
    title: 'A prompt, its declared variables, and what actually reaches the model',
    note:
      'Delete {{venue}} from content and missingRequiredVariables names it — a declared variable the body never uses sends the model a question with the fact missing, silently.',
    mock: {
      content:
        'Write a short, friendly description for a pod called "{{title}}" at {{venue}} in {{city}}. Keep it under 40 words.',
      variables: [
        {
          name: 'title',
          label: 'Pod title',
          description: "The pod's own name, as the host typed it",
          example: 'Sunday Badminton Doubles',
          required: true,
        },
        {
          name: 'venue',
          label: 'Venue',
          description: 'Where the pod meets, with its locality',
          example: 'Play Arena, HSR Layout',
          required: true,
        },
        {
          name: 'city',
          label: 'City',
          description: 'Only set when the pod is city-scoped',
          example: 'Bengaluru',
          required: false,
        },
        {
          name: 'tone',
          label: 'Tone',
          description: 'How the copy should read',
          example: 'warm',
          required: true,
        },
      ],
    },
    compute: (mock) => {
      const values = exampleValues(mock.variables);
      return {
        'Placeholders the body uses': extractVariables(mock.content),
        'Declared but never used': missingRequiredVariables(mock.content, mock.variables),
        'Example values': values,
        'What the model receives': renderPrompt(mock.content, values),
        'Estimated tokens': estimateTokens(renderPrompt(mock.content, values)),
        'An unfilled placeholder stays itself': braced('tone'),
      };
    },
  }),
  defineDemo<ShareMock>({
    id: 'share',
    title: 'A shared prompt: what the visitor composed, and how it reaches each LLM',
    note:
      'Empty a value in input.values and its {{placeholder}} stays visible in the composed prompt. Make the body longer than 6000 characters and every link stops carrying it (prefilled: false) — the page copies it instead.',
    mock: {
      content: 'Plan a weekend in {{city}} for {{who}}.',
      input: { values: { city: 'Pune', who: '' }, extra: 'Cheap food only.' },
      token: 'AbCdEfGhIjKlMnOpQrStUvWx',
    },
    compute: (mock) => {
      const composed = composePrompt(mock.content, mock.input);
      return {
        'Public link': publicShareUrl('https://ai.duncit.com', mock.token),
        'Composed prompt': composed,
        'Links per LLM': Object.fromEntries(PROMPT_PLATFORMS.map((platform) => [platform.name, platformLink(platform, composed)])),
        'Claude console script': injectionScript(PROMPT_PLATFORMS[0], composed, {
          noComposer: 'No chat box on this page.',
          inserted: 'Prompt added; review it and press send.',
        }),
      };
    },
  }),
]);
