import { parseToolFields, toolConfigIssues, withDefaults, type ToolConfig } from '@duncit/challenges';
import { defineDemo, defineDemos } from '../types';

interface ConfigMock {
  config_schema_json: string;
  config: ToolConfig;
}

/** The field list the server publishes for the Score Counter tool. */
const SCORE_COUNTER_FIELDS = JSON.stringify([
  { key: 'unit', kind: 'text', default: 'points' },
  { key: 'increments', kind: 'number_list', default: [1, 2, 3] },
  { key: 'allow_negative', kind: 'boolean', default: false },
  { key: 'max_value', kind: 'number', default: 0, min: 0 },
  { key: 'counts_toward_total', kind: 'boolean', default: true },
  { key: 'weight', kind: 'number', default: 1, min: -100, max: 100 },
]);

/** The field list the server publishes for the Quiz tool: a list-valued setting. */
const QUIZ_FIELDS = JSON.stringify([
  { key: 'questions', kind: 'questions', default: [] },
  { key: 'counts_toward_total', kind: 'boolean', default: true },
  { key: 'weight', kind: 'number', default: 1, min: -100, max: 100 },
]);

export default defineDemos('challenges', [
  defineDemo<ConfigMock>({
    id: 'tool-config',
    title: 'One Score Counter, configured for cricket',
    note:
      'The same universal tool serves every sport — only its settings differ. Edit the config: a zero in the score buttons, or a weight beyond ±100, is caught here exactly as the server would refuse it.',
    mock: {
      config_schema_json: SCORE_COUNTER_FIELDS,
      config: { unit: 'runs', increments: [1, 2, 4, 6], weight: 1 },
    },
    compute: (mock) => {
      const fields = parseToolFields(mock.config_schema_json);
      const complete = withDefaults(fields, mock.config);
      return {
        'Settings after defaults': complete,
        'Problems the server would refuse': toolConfigIssues(fields, complete),
      };
    },
  }),
  defineDemo<ConfigMock>({
    id: 'tool-config-lists',
    title: 'A Quiz tool and its questions',
    note:
      'Quiz questions, checklist tasks, poll options and formula terms are list-valued settings. Remove an answer so a question has fewer than two, or point "correct" past the last answer, and the question is refused here as it would be on the server.',
    mock: {
      config_schema_json: QUIZ_FIELDS,
      config: {
        questions: [
          { key: 'q1', label: 'How many players bat at once in cricket?', options: ['One', 'Two', 'Eleven'], correct: 1, points: 2 },
        ],
      },
    },
    compute: (mock) => {
      const fields = parseToolFields(mock.config_schema_json);
      const complete = withDefaults(fields, mock.config);
      return {
        'Settings after defaults': complete,
        'Problems the server would refuse': toolConfigIssues(fields, complete),
      };
    },
  }),
]);
