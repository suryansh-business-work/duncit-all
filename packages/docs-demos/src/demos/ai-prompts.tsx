import {
  braced,
  estimateTokens,
  exampleValues,
  extractVariables,
  missingRequiredVariables,
  renderPrompt,
  type PromptVariable,
} from '@duncit/ai-prompts';
import { defineDemo, defineDemos } from '../types';

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
]);
